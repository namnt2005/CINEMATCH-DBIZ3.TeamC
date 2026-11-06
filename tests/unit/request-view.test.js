import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-23 and SC-25 view rules (T049, FR-012..FR-014, BR-005, BR-006, D7).
const view = () => import('../../app/requests/request-view.js');

describe('SC-23 send request view (T049)', () => {
  test('#4: only non-archived projects where the member is owner or edit (SR-343)', async () => {
    const { eligibleProjects } = await view();
    const projects = [{ project_id: 'a', permission: 'owner', stage: 'preparing' }, { project_id: 'b', permission: 'view', stage: 'draft' },
      { project_id: 'c', permission: 'edit', stage: 'archived' }, { project_id: 'd', permission: 'edit', stage: 'draft' }];
    assert.deepEqual(eligibleProjects(projects).map(p => p.project_id), ['a', 'd']);
  });

  test('#6: the organisation\'s own groups first, then the others; #7 note counter; #10 Send needs #4 and #6', async () => {
    const { orderedServices, noteCounter, canSend } = await view();
    const ordered = orderedServices(['crew', 'casting']);
    assert.deepEqual(ordered.slice(0, 2), ['casting', 'crew'].sort((a, b) => ['full_production', 'permits_paperwork', 'casting', 'crew'].indexOf(a) - ['full_production', 'permits_paperwork', 'casting', 'crew'].indexOf(b)));
    assert.equal(ordered.length, 12);
    assert.deepEqual(noteCounter('x'.repeat(999)), { length: 999, max: 1000, over: false });
    assert.equal(noteCounter('x'.repeat(1001)).over, true);
    assert.equal(canSend({ project_id: '', services: ['crew'], note: '' }), false);
    assert.equal(canSend({ project_id: 'p', services: [], note: '' }), false);
    assert.equal(canSend({ project_id: 'p', services: ['crew'], note: 'x'.repeat(1001) }), false);
    assert.equal(canSend({ project_id: 'p', services: ['crew'], note: '' }), true);
  });

  test('#8, SR-345: the Article 13 notice only when the organisation is not eligible', async () => {
    const { showArt13Notice } = await view();
    assert.equal(showArt13Notice({ art13_eligible: true, verified: true }), false);
    assert.equal(showArt13Notice({ art13_eligible: false, verified: true }), true);
    assert.equal(showArt13Notice({ art13_eligible: true, verified: false }), true, 'eligibility counts only while Verified');
  });
});

describe('SC-25 request view (T049)', () => {
  test('#5, D7: exactly five steps; end states are not steps (SR-141)', async () => {
    const { stepper, endState } = await view();
    const s = stepper({ status: 'accepted', step: 3 });
    assert.deepEqual(s.map(x => x.key), ['sent', 'viewed', 'accepted', 'nda', 'confirmed']);
    assert.deepEqual(s.map(x => x.state), ['done', 'done', 'done', 'current', 'todo']);
    assert.deepEqual(stepper({ status: 'confirmed', step: 5 }).map(x => x.state), ['done', 'done', 'done', 'done', 'done']);
    assert.equal(endState({ status: 'declined' }), 'declined');
    assert.equal(endState({ status: 'withdrawn' }), 'withdrawn');
    assert.equal(endState({ status: 'accepted' }), null);
    for (const key of ['sent', 'viewed', 'accepted', 'nda', 'confirmed']) {
      assert.equal(typeof vi[`requests.step.${key}`], 'string', key);
      assert.equal(typeof en[`requests.step.${key}`], 'string', key);
    }
    assert.equal(en['requests.step.viewed'], 'Viewed');
    assert.equal(en['requests.step.nda'], 'NDA agreed');
  });

  test('#9, #10, SR-143: Confirm partnership only on accepted, after the producer NDA; partner buttons only for the partner', async () => {
    const { buttons } = await view();
    assert.deepEqual(buttons({ can: { respond: false, accept_nda: true, confirm: false, withdraw: true, message: true } }),
      { ndaBox: true, confirm: 'disabled', partner: false, withdraw: true });
    assert.deepEqual(buttons({ can: { respond: false, accept_nda: false, confirm: true, withdraw: true, message: true } }),
      { ndaBox: false, confirm: 'enabled', partner: false, withdraw: true });
    assert.deepEqual(buttons({ can: { respond: true, accept_nda: false, confirm: false, withdraw: false, message: true } }),
      { ndaBox: false, confirm: 'hidden', partner: true, withdraw: false });
  });

  test('#12 composer 1–2000; #13 the consequences note says component c is not marked present (SR-144, BR-006)', async () => {
    const { composerValid, CONSEQUENCE_KEY } = await view();
    assert.equal(composerValid(''), false);
    assert.equal(composerValid('   '), false);
    assert.equal(composerValid('x'.repeat(2000)), true);
    assert.equal(composerValid('x'.repeat(2001)), false);
    assert.match(en[CONSEQUENCE_KEY], /not mark|does not|is not/i);
    assert.match(en[CONSEQUENCE_KEY], /component c|item c/i);
    assert.equal(typeof vi[CONSEQUENCE_KEY], 'string');
  });

  test('research OQ4: the withdraw hint after 14 days without a partner response', async () => {
    const { showWithdrawHint } = await view();
    assert.equal(showWithdrawHint({ status: 'pending', quiet_days: 13 }), false);
    assert.equal(showWithdrawHint({ status: 'pending', quiet_days: 14 }), true);
    assert.equal(showWithdrawHint({ status: 'accepted', quiet_days: 30 }), false);
  });
});
