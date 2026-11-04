import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// SC-13 view rules (SR-271, SR-272, SR-275; screen-spec-SC-13 #3–#24 and Empty state)
const load = () => import('../../app/projects/[id]/settings/settings-view.js');
const project = (permission, stage = 'draft') => ({ permission, stage });

describe('SC-13 project settings view (T040, FR-002, FR-004, BR-005)', () => {
  test('SR-271: details are editable for owner and edit, read-only for view and for an archived project', async () => {
    const { canEdit } = await load();
    assert.equal(canEdit(project('owner')), true);
    assert.equal(canEdit(project('edit', 'preparing')), true);
    assert.equal(canEdit(project('view')), false);
    assert.equal(canEdit(project('owner', 'archived')), false);
  });

  test('SR-272: the invite row is for the owner only, never on an archived project', async () => {
    const { canInvite } = await load();
    assert.equal(canInvite(project('owner')), true);
    assert.equal(canInvite(project('edit')), false);
    assert.equal(canInvite(project('view')), false);
    assert.equal(canInvite(project('owner', 'archived')), false);
  });

  test('SR-275: the archive card shows for owner and edit, and is hidden once archived; there is no delete', async () => {
    const mod = await load();
    assert.equal(mod.showArchive(project('owner')), true);
    assert.equal(mod.showArchive(project('edit')), true);
    assert.equal(mod.showArchive(project('view')), false);
    assert.equal(mod.showArchive(project('edit', 'archived')), false);
    assert.deepEqual(Object.keys(mod).filter(k => /delete|remove/i.test(k)), []);
  });

  test('SC-13 Empty state: the Only you line when the caller is the only member and nobody is invited', async () => {
    const { isAlone } = await load();
    assert.equal(isAlone([{ permission: 'owner', invite_status: 'accepted' }]), true);
    assert.equal(isAlone([{ permission: 'owner', invite_status: 'accepted' }, { permission: 'view', invite_status: 'pending' }]), false);
  });

  test('SC-13 #18, #19: the creator shows as Owner; statuses Pending / Accepted; a deactivated account is Former member', async () => {
    const { memberLine } = await load();
    assert.deepEqual(memberLine({ permission: 'owner', invite_status: 'accepted', full_name: 'Lena Park', invitee_email: 'lena.park@harbourline.example.kr' }),
      { name: 'Lena Park', email: 'lena.park@harbourline.example.kr', role: 'projects.permission.owner', status: 'settings.status.accepted' });
    assert.equal(memberLine({ permission: 'view', invite_status: 'pending', full_name: null, invitee_email: 'a@b.vn' }).status, 'settings.status.pending');
    assert.equal(memberLine({ permission: 'view', invite_status: 'accepted', full_name: null, invitee_email: 'former-member-2e513ee3@anonymised.example' }).name, 'settings.members.former');
  });

  test('H2 decision: the stage select offers Draft and Preparing to editors; archived only through Archive', async () => {
    const { stageOptions } = await load();
    assert.deepEqual(stageOptions(project('owner')), ['draft', 'preparing']);
    assert.deepEqual(stageOptions(project('view')), []);
    assert.deepEqual(stageOptions(project('edit', 'archived')), []);
  });
});
