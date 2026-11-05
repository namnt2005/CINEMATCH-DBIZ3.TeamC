import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-32 member and staff view rules, and the SC-16 button (T015; SC-32 #4–#12, R7, R10, D7)
const load = () => import('../../app/projects/[id]/provinces/provinces-view.js');
const base = { notice_id: 'n', drafted_at: '2026-11-06T09:00:00+07:00', review_status: 'draft', review_note: null, delivery_status: null, sent_at: null, responded_at: null, response: null, missing: [] };

describe('SC-32 view rules (T015)', () => {
  test('SC-32 #5: exactly four steps — drafted, reviewed by VFDA, downloaded and sent by you, province replied', async () => {
    const { steps } = await load();
    assert.deepEqual(steps(base).map(s => [s.key, s.done]), [['drafted', true], ['reviewed', false], ['sent', false], ['replied', false]]);
    const done = steps({ ...base, review_status: 'approved', delivery_status: 'downloaded', sent_at: '2026-11-07T10:00:00+07:00', responded_at: '2026-11-08T10:00:00+07:00', response: 'received' });
    assert.ok(done.every(s => s.done));
  });

  test('R1, US-1 Scenario 2: each state gives one card action; a missing first shooting day disables the review request', async () => {
    const { cardAction } = await load();
    assert.deepEqual(cardAction(base, 'owner'), { kind: 'submit', disabled: false, reason: null });
    assert.deepEqual(cardAction({ ...base, missing: ['shoot_date'] }, 'owner'), { kind: 'submit', disabled: true, reason: 'notices.missing.shoot_date' });
    assert.equal(cardAction({ ...base, review_status: 'submitted' }, 'owner').kind, 'waiting');
    assert.deepEqual(cardAction({ ...base, review_status: 'changes_requested', review_note: 'Add the crew size.' }, 'edit'), { kind: 'resubmit', disabled: false, reason: null, note: 'Add the crew size.' });
    assert.deepEqual(cardAction({ ...base, review_status: 'approved', delivery_status: 'queued' }, 'owner'), { kind: 'download', record: true });
    assert.equal(cardAction({ ...base, review_status: 'approved', delivery_status: 'downloaded', sent_at: 'x' }, 'owner').kind, 'reply');
  });

  test('D7: view members and archived projects only download, without recording', async () => {
    const { cardAction } = await load();
    assert.deepEqual(cardAction({ ...base, review_status: 'approved', delivery_status: 'queued' }, 'view'), { kind: 'download', record: false });
    assert.deepEqual(cardAction({ ...base, review_status: 'approved', delivery_status: 'downloaded', sent_at: 'x' }, 'view'), { kind: 'download', record: false });
    assert.deepEqual(cardAction({ ...base, review_status: 'approved', delivery_status: 'queued' }, 'owner', { archived: true }), { kind: 'download', record: false });
    assert.equal(cardAction(base, 'view').kind, 'none');
  });

  test('SC-32 #6: the reply status always has text — Waiting when there is none', async () => {
    const { replyStatus } = await load();
    assert.equal(replyStatus(base), 'notices.reply.waiting');
    for (const r of ['received', 'info_needed', 'cannot_support']) assert.equal(replyStatus({ ...base, response: r }), `notices.reply.${r}`);
  });

  test('SC-32 #12: the permit note is always there, in both languages, with the BR-002 meaning', async () => {
    const { PERMIT_NOTE } = await load();
    assert.ok(vi[PERMIT_NOTE] && en[PERMIT_NOTE]);
    assert.match(en[PERMIT_NOTE], /does not replace the filming licence/i);
  });

  test('R6: staff tabs Submitted (default) / Changes requested / Approved', async () => {
    const { staffTabs } = await load();
    assert.deepEqual(staffTabs(null), [{ status: 'submitted', active: true }, { status: 'changes_requested', active: false }, { status: 'approved', active: false }]);
    assert.equal(staffTabs('approved').find(t => t.active).status, 'approved');
  });

  test('R10: the SC-16 button is offered only for owner / edit projects; guests are asked to sign in', async () => {
    const { interestChoice } = await load();
    assert.deepEqual(interestChoice({ signedIn: false, projects: [] }), { kind: 'signin' });
    const projects = [{ project_id: 'a', permission: 'owner', stage: 'draft' }, { project_id: 'b', permission: 'view', stage: 'draft' }, { project_id: 'c', permission: 'edit', stage: 'archived' }];
    assert.deepEqual(interestChoice({ signedIn: true, projects }), { kind: 'choose', projects: [projects[0]] });
    assert.deepEqual(interestChoice({ signedIn: true, projects: [projects[1]] }), { kind: 'none' });
  });

  test('FR-006 of SYS: every key the helpers return exists in both dictionaries', async () => {
    const mod = await load();
    const keys = ['notices.missing.shoot_date', mod.replyStatus(base), ...['received', 'info_needed', 'cannot_support'].map(r => mod.replyStatus({ ...base, response: r })),
      ...mod.steps(base).map(s => `notices.step.${s.key}`), ...mod.staffTabs(null).map(t => `notices.tab.${t.status}`)];
    for (const key of keys) assert.ok(vi[key] && en[key], key);
  });
});
