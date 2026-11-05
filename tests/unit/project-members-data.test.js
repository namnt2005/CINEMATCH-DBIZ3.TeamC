import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { query, getOne } from '../../lib/db/client.js';

// Invitations on node:sqlite (FR-004, US-3 Scenario 1, plan D3). Tests run in order (one shared database).
const projects = () => import('../../lib/db/projects.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');   // The Last Ferry: owner
const HAN = member('b9916111-9b75-5ab9-b88c-4d578a87cd46');    // The Last Ferry: edit
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const INVITEE_EMAIL = 't037.line.producer@example.test';
let invitee;
let memberId;

describe('inviteMember, listInvitations, acceptInvitation (T037, FR-004, US-3 Scenario 1, D3)', () => {
  test('US-3 Scenario 1: the owner invites with edit — one pending row and one queued email, no notification', async () => {
    const { inviteMember } = await projects();
    const before = getOne('SELECT COUNT(*) AS n FROM notification').n;
    ({ member_id: memberId } = await inviteMember(PARK, FERRY, { invitee_email: INVITEE_EMAIL, permission: 'edit' }));
    const row = getOne('SELECT * FROM project_member WHERE member_id = ?', [memberId]);
    assert.deepEqual({ user_id: row.user_id, invitee_email: row.invitee_email, permission: row.permission, invite_status: row.invite_status },
      { user_id: null, invitee_email: INVITEE_EMAIL, permission: 'edit', invite_status: 'pending' });
    const emails = query("SELECT * FROM email_delivery WHERE recipient_email = ? AND template_id = 'project.invite'", [INVITEE_EMAIL]);
    assert.equal(emails.length, 1);
    assert.equal(emails[0].delivery_status, 'queued');
    assert.equal(emails[0].notification_id, null);
    assert.equal(JSON.parse(emails[0].variables).project_name, 'The Last Ferry');
    assert.equal(getOne('SELECT COUNT(*) AS n FROM notification').n, before);
  });

  test('FR-004, SR-272: a member who is not the owner cannot invite', async () => {
    const { inviteMember } = await projects();
    await assert.rejects(inviteMember(HAN, FERRY, { invitee_email: 'someone@example.test', permission: 'view' }), { code: 'FORBIDDEN' });
  });

  test('SC-13 #20: an email already a member or pending is refused with ALREADY_INVITED, whatever its case', async () => {
    const { inviteMember } = await projects();
    for (const email of ['jiwoo.han@harbourline.example.kr', 'Seo.Yeon.Kim@harbourline.example.kr', INVITEE_EMAIL.toUpperCase()]) {
      await assert.rejects(inviteMember(PARK, FERRY, { invitee_email: email, permission: 'view' }), { code: 'ALREADY_INVITED' }, email);
    }
  });

  test('D3: the invitee signs up with the invited email and sees the invitation; others do not', async () => {
    const { listInvitations } = await projects();
    const userId = randomUUID();
    query("INSERT INTO user_account (user_id, email, email_verified, role, account_status, created_at) VALUES (?, ?, 'true', 'member', 'active', '2026-11-03T09:00:00+07:00')", [userId, INVITEE_EMAIL]);
    invitee = member(userId);
    const mine = await listInvitations(invitee);
    assert.deepEqual(mine.map(i => [i.member_id, i.project_name, i.permission]), [[memberId, 'The Last Ferry', 'edit']]);
    assert.deepEqual(await listInvitations(HAN), []);
  });

  test('D3: only the account with the invited email can accept', async () => {
    const { acceptInvitation } = await projects();
    await assert.rejects(acceptInvitation(HAN, memberId), { code: 'NOT_FOUND' });
    assert.equal(getOne('SELECT invite_status FROM project_member WHERE member_id = ?', [memberId]).invite_status, 'pending');
  });

  test('US-3 Scenario 1: after accepting, the project is in the invitee\'s list with edit permission', async () => {
    const { acceptInvitation, listProjects, listInvitations } = await projects();
    assert.deepEqual(await acceptInvitation(invitee, memberId), { project_id: FERRY });
    const row = getOne('SELECT user_id, invite_status FROM project_member WHERE member_id = ?', [memberId]);
    assert.deepEqual({ ...row }, { user_id: invitee.userId, invite_status: 'accepted' });
    const card = (await listProjects(invitee)).projects.find(p => p.project_id === FERRY);
    assert.equal(card.permission, 'edit');
    assert.deepEqual(await listInvitations(invitee), []);
    await assert.rejects(acceptInvitation(invitee, memberId), { code: 'NOT_FOUND' }, 'an invitation is accepted once');
  });
});
