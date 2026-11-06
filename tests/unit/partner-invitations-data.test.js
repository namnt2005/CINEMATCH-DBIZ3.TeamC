import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { getOne, query } from '../../lib/db/client.js';

// Partner invitations on node:sqlite (T025, M4 BR-003, SYS BR-002 as changed 06/11/2026, D2). One database, tests in order.
const invitations = () => import('../../lib/db/partner-invitations.js');
const user = (role, userId) => ({ role, isAuthenticated: true, userId });
const STAFF = user('vfda_staff', '515529a9-46d9-559c-aab4-e5fb31eedeea');
const ADMIN = user('admin', 'dffdeb6f-0d86-5bd0-8d0e-85962427b1d2');
const LEGAL = user('vfda_legal', 'd8eb7d55-1c9f-59fe-8ebf-2c509ea2b49f');
const YUI = user('member', '118de3c8-88eb-5003-a2f9-26bbdd0186ae');      // on Lantern Street
const LAN = user('partner', 'ccc2764e-7734-5390-9c71-46963d2f7820');
const NEW_USER = '00000000-0000-4000-8000-00000000abcd';                // a new sign-up (member, on no project)
const NEW = user('member', NEW_USER);
const sha = (s) => createHash('sha256').update(s).digest('hex');
const ORG = { org_name: 'Hanoi New Films', legal_form: 'Công ty TNHH', service_groups: ['crew'], provinces: [1], hq_province: 1 };
let invited;

describe('Partner invitations on node:sqlite (T025)', () => {
  test('vfda_staff invite: the organisation is created, the code is returned once and only its SHA-256 is kept; one audit row', async () => {
    const { createInvitation } = await invitations();
    const before = Number(getOne("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'partner.invite'").n);
    invited = await createInvitation(STAFF, { org: ORG, email: 'Owner@HanoiNew.example.vn' });
    assert.match(invited.code, /^[0-9a-f]{64}$/);
    const row = getOne('SELECT * FROM partner_invitation WHERE invitation_id = ?', [invited.invitation_id]);
    assert.equal(row.email, 'owner@hanoinew.example.vn');
    assert.equal(row.code_hash, sha(invited.code));
    assert.equal(JSON.stringify(row).includes(invited.code), false, 'the code itself is stored nowhere');
    assert.equal(getOne('SELECT slug FROM organisation WHERE org_id = ?', [invited.org_id]).slug, 'hanoi-new-films');
    assert.equal(Number(getOne("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'partner.invite'").n), before + 1);
    assert.equal(getOne("SELECT admin_id FROM audit_log WHERE action = 'partner.invite' AND target_id = ?", [invited.invitation_id]).admin_id, STAFF.userId);
  });

  test('an admin may invite too; members, partners and the Legal Board may not; one open invitation per email and organisation', async () => {
    const { createInvitation } = await invitations();
    const byAdmin = await createInvitation(ADMIN, { org_id: invited.org_id, email: 'second@hanoinew.example.vn' });
    assert.ok(byAdmin.invitation_id);
    for (const session of [YUI, LAN, LEGAL]) {
      await assert.rejects(() => createInvitation(session, { org_id: invited.org_id, email: 'x@hanoinew.example.vn' }), (e) => e.code === 'FORBIDDEN', session.role);
    }
    await assert.rejects(() => createInvitation(STAFF, { org_id: invited.org_id, email: 'owner@hanoinew.example.vn' }), (e) => e.code === 'INVITATION_OPEN');
  });

  test('acceptance refusals: another email, an expired or unknown code, an account already on a project', async () => {
    const { acceptInvitation, createInvitation } = await invitations();
    query("INSERT INTO user_account (user_id, email, email_verified, role, account_status, created_at) VALUES (?, 'owner@hanoinew.example.vn', 'true', 'member', 'active', '2026-11-06T09:00:00+07:00')", [NEW_USER]);
    await assert.rejects(() => acceptInvitation(YUI, invited.code), (e) => e.code === 'EMAIL_MISMATCH');
    await assert.rejects(() => acceptInvitation(NEW, 'seed-invitation-i-saigonline'), (e) => e.code === 'INVITATION_INVALID', 'expired seed invitation');
    await assert.rejects(() => acceptInvitation(NEW, 'no-such-code'), (e) => e.code === 'INVITATION_INVALID');
    const forYui = await createInvitation(STAFF, { org_id: invited.org_id, email: 'yui.tanaka@sakuralane.example.jp' });
    await assert.rejects(() => acceptInvitation(YUI, forYui.code), (e) => e.code === 'ALREADY_MEMBER_OF_PROJECT', 'research Open question 3');
  });

  test('BR-003: the right account becomes partner of that organisation; the grant is audited by the inviter; the code is used once', async () => {
    const { acceptInvitation } = await invitations();
    const out = await acceptInvitation(NEW, invited.code);
    assert.deepEqual(out, { role: 'partner', org_id: invited.org_id, org_slug: 'hanoi-new-films' });
    assert.equal(getOne('SELECT role FROM user_account WHERE user_id = ?', [NEW_USER]).role, 'partner');
    assert.ok(getOne('SELECT 1 AS x FROM organisation_user WHERE org_id = ? AND user_id = ?', [invited.org_id, NEW_USER]));
    const inv = getOne('SELECT accepted_at, accepted_by FROM partner_invitation WHERE invitation_id = ?', [invited.invitation_id]);
    assert.ok(inv.accepted_at);
    assert.equal(inv.accepted_by, NEW_USER);
    assert.equal(getOne("SELECT admin_id FROM audit_log WHERE action = 'role.grant' AND target_id = ?", [NEW_USER]).admin_id, STAFF.userId);
    await assert.rejects(() => acceptInvitation(user('partner', NEW_USER), invited.code), (e) => e.code === 'INVITATION_INVALID');
  });
});
