import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Shared partner rules (T006): the 12 groups (BR-002), the badge (BR-004, FR-011), the request state machine (BR-005).
const groups = () => import('../../lib/partners/service-groups.js');
const badge = () => import('../../lib/partners/badge.js');
const lifecycle = () => import('../../lib/partners/lifecycle.js');

describe('Service groups (BR-002)', () => {
  test('the 12 values in the order of the schema CHECK list; nothing else is a group', async () => {
    const { SERVICE_GROUPS, isServiceGroup } = await groups();
    const schema = fs.readFileSync('data/seed/schema.json', 'utf8');
    const listed = ['full_production', 'permits_paperwork', 'casting', 'crew', 'camera_lighting', 'studios_interiors',
      'location_management', 'transport_logistics', 'lodging_catering', 'interpreting', 'insurance_legal', 'post_production'];
    for (const g of listed) assert.ok(schema.includes(g), `${g} is in data/seed/schema.json`);
    assert.deepEqual([...SERVICE_GROUPS], listed);
    assert.ok(Object.isFrozen(SERVICE_GROUPS));
    for (const bad of ['visa', 'Full_production', '', null, undefined]) assert.equal(isServiceGroup(bad), false, String(bad));
  });
});

describe('VFDA Verified badge (BR-004, FR-011)', () => {
  const org = (verified_at, verified_until) => ({ verified_at, verified_until });

  test('valid for 12 months: true on the last day, false the day after, false when never verified', async () => {
    const { isVerified, verifiedUntil } = await badge();
    assert.equal(verifiedUntil('2026-06-12T10:00:00+07:00'), '2027-06-12');
    assert.equal(verifiedUntil('2028-02-29T10:00:00+07:00'), '2029-02-28', 'a leap day ends on 28 February');
    const benXua = org('2026-06-12T10:00:00+07:00', '2027-06-12');
    assert.equal(isVerified(benXua, '2027-06-12'), true, 'the last day still counts');
    assert.equal(isVerified(benXua, '2027-06-13'), false, 'gone the day after');
    assert.equal(isVerified(org('2025-08-15T11:00:00+07:00', '2026-08-15'), '2026-11-06'), false, 'Sông Hậu, ended 15/08/2026');
    assert.equal(isVerified(org(null, null), '2026-11-06'), false);
  });

  test('"today" is the Vietnam date', async () => {
    const { todayInVietnam } = await badge();
    assert.equal(todayInVietnam(new Date('2026-08-14T16:30:00Z')), '2026-08-14');
    assert.equal(todayInVietnam(new Date('2026-08-14T17:30:00Z')), '2026-08-15', '23:30 UTC on 14/08 is 00:30 on 15/08 in Vietnam');
  });

  test('verified month, and the 30-day reminder window', async () => {
    const { verifiedMonth, isExpiring } = await badge();
    assert.equal(verifiedMonth({ verified_at: '2026-06-12T10:00:00+07:00', verified_until: '2027-06-12' }, '2026-11-06'), '2026-06');
    assert.equal(verifiedMonth({ verified_at: '2025-08-15T11:00:00+07:00', verified_until: '2026-08-15' }, '2026-11-06'), null);
    const b = { verified_at: '2026-06-12T10:00:00+07:00', verified_until: '2027-06-12' };
    assert.equal(isExpiring(b, '2027-05-13'), true, '30 days before');
    assert.equal(isExpiring(b, '2027-05-12'), false, '31 days before');
    assert.equal(isExpiring(b, '2027-06-13'), false, 'already expired');
  });
});

describe('Request state machine (BR-005)', () => {
  const OPEN = ['pending', 'under_review', 'info_requested'];

  test('only the partner responds: under review, more information, accept (with its NDA), decline', async () => {
    const { transition } = await lifecycle();
    for (const from of OPEN) {
      for (const to of ['under_review', 'info_requested', 'declined']) {
        assert.equal(transition(from, 'respond', { side: 'partner', decision: to }).to, to, `${from} → ${to}`);
        assert.equal(transition(from, 'respond', { side: 'producer', decision: to }).error, 'FORBIDDEN', `producer cannot ${to}`);
      }
      assert.equal(transition(from, 'respond', { side: 'partner', decision: 'accepted', ndaAccepted: true }).to, 'accepted');
      assert.equal(transition(from, 'respond', { side: 'partner', decision: 'accepted' }).error, 'NDA_REQUIRED');
      assert.equal(transition(from, 'respond', { side: 'producer', decision: 'accepted', ndaAccepted: true }).error, 'FORBIDDEN');
    }
  });

  test('only the producer confirms — from accepted, after their own NDA — and only the producer withdraws', async () => {
    const { transition } = await lifecycle();
    assert.equal(transition('accepted', 'confirm', { side: 'producer', producerNda: true }).to, 'confirmed');
    assert.equal(transition('accepted', 'confirm', { side: 'producer', producerNda: false }).error, 'NDA_REQUIRED');
    assert.equal(transition('accepted', 'confirm', { side: 'partner', producerNda: true }).error, 'FORBIDDEN');
    for (const from of OPEN) assert.equal(transition(from, 'confirm', { side: 'producer', producerNda: true }).error, 'INVALID_STATE', from);
    for (const from of [...OPEN, 'accepted']) {
      assert.equal(transition(from, 'withdraw', { side: 'producer' }).to, 'withdrawn', from);
      assert.equal(transition(from, 'withdraw', { side: 'partner' }).error, 'FORBIDDEN', from);
    }
    assert.equal(transition('accepted', 'respond', { side: 'partner', decision: 'declined' }).error, 'INVALID_STATE', 'an accepted request is not re-answered');
  });

  test('declined, withdrawn and confirmed are final: every action is refused', async () => {
    const { transition, isFinal } = await lifecycle();
    for (const from of ['declined', 'withdrawn', 'confirmed']) {
      assert.equal(isFinal(from), true, from);
      for (const [action, opts] of [['respond', { side: 'partner', decision: 'under_review' }], ['respond', { side: 'partner', decision: 'accepted', ndaAccepted: true }],
        ['confirm', { side: 'producer', producerNda: true }], ['withdraw', { side: 'producer' }]]) {
        assert.equal(transition(from, action, opts).error, 'INVALID_STATE', `${from}: ${action}`);
      }
    }
    for (const s of [...OPEN, 'accepted']) assert.equal(isFinal(s), false, s);
  });

  // Five steps since 06/11/2026 (Nam Tran; SC-25 SR-141 changed at tools/s2_en.py): Sent → Viewed → Accepted → NDA agreed → Confirmed
  test('SC-25: exactly five steps; end states are not steps (SR-141)', async () => {
    const { step, STEPS, OPEN_STATUSES } = await lifecycle();
    assert.deepEqual([...OPEN_STATUSES], ['pending', 'under_review', 'info_requested', 'accepted']);
    assert.deepEqual([...STEPS], ['sent', 'viewed', 'accepted', 'nda', 'confirmed']);
    assert.equal(step('pending'), 1);
    for (const s of ['under_review', 'info_requested']) assert.equal(step(s), 2, s);
    assert.equal(step('accepted'), 3, 'accepted, the producer NDA not yet ticked');
    assert.equal(step('accepted', { producerNda: true }), 4, 'NDA agreed by both sides');
    assert.equal(step('confirmed'), 5);
    assert.equal(step('declined'), null);
    assert.equal(step('withdrawn'), null);
  });
});
