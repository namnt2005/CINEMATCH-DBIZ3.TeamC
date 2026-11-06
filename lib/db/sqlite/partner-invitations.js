import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam, writeAudit } from '../audit.js';
import { PartnerError } from '../../partners/errors.js';
import { INVITATION_DAYS, newCode, codeHash, orgSlug, maskEmail, invitationState } from '../../partners/invitations.js';
import { validateInvitationEmail, validateOrganisationFields } from '../../partners/input.js';
import { userOf, isStaff } from './partner-access.js';

// node:sqlite twin of app_create_partner_invitation and app_accept_partner_invitation (20261106000200_m4_partners.sql).
// The accepting function is the only code that gives an account the partner role (T024).

const plusDays = (iso, days) => new Date(new Date(iso).getTime() + days * 86400000 + 7 * 3600000).toISOString().replace('Z', '+07:00');
const isOpen = (inv, now) => !inv.accepted_at && new Date(inv.expires_at) > new Date(now);

function freeSlug(db, name) {
  const base = orgSlug(name);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!db.prepare('SELECT 1 AS x FROM organisation WHERE slug = ?').get(slug)) return slug;
  }
}

/** vfda_staff or admin: the organisation's public layer when `org` is given, then the invitation; the code is returned once. */
export function createInvitation(session, { org_id: orgId = null, org = null, email }, { now = nowInVietnam() } = {}) {
  if (!userOf(session)) throw new PartnerError('UNAUTHENTICATED');
  if (!isStaff(session)) throw new PartnerError('FORBIDDEN');
  const address = validateInvitationEmail(email);
  if (!address.ok) throw new PartnerError('VALIDATION_ERROR', address.errors);
  const fields = orgId ? null : validateOrganisationFields(org);
  if (fields && !fields.ok) throw new PartnerError('VALIDATION_ERROR', fields.errors);
  const code = newCode();
  const invitationId = randomUUID();
  const expiresAt = plusDays(now, INVITATION_DAYS);
  let target = orgId;
  withTransaction((db) => {
    if (target) {
      if (!db.prepare('SELECT 1 AS x FROM organisation WHERE org_id = ?').get(target)) throw new PartnerError('NOT_FOUND');
    } else {
      const o = fields.value;
      target = randomUUID();
      db.prepare(`INSERT INTO organisation (org_id, slug, org_name, legal_form, founded_year, hq_province, service_groups, provinces,
        verified_at, verified_until, art13_eligible, org_status) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, 'false', 'active')`)
        .run(target, freeSlug(db, o.org_name), o.org_name, o.legal_form, o.hq_province, JSON.stringify(o.service_groups), JSON.stringify(o.provinces));
    }
    const open = db.prepare('SELECT accepted_at, expires_at FROM partner_invitation WHERE org_id = ? AND email = ?').all(target, address.value);
    if (open.some(i => isOpen(i, now))) throw new PartnerError('INVITATION_OPEN');
    db.prepare(`INSERT INTO partner_invitation (invitation_id, org_id, email, code_hash, invited_by, invited_at, expires_at, accepted_at, accepted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)`).run(invitationId, target, address.value, codeHash(code), session.userId, now, expiresAt);
    writeAudit(db, { action: 'partner.invite', adminId: session.userId, targetId: invitationId });
  });
  const orgName = getOne('SELECT org_name FROM organisation WHERE org_id = ?', [target]).org_name;
  return { invitation_id: invitationId, org_id: target, org_name: orgName, expires_at: expiresAt, code };
}

export function listInvitations(session, { now = nowInVietnam() } = {}) {
  if (!userOf(session)) throw new PartnerError('UNAUTHENTICATED');
  if (!isStaff(session)) throw new PartnerError('FORBIDDEN');
  const list = query(`SELECT i.invitation_id, i.email, i.invited_at, i.expires_at, i.accepted_at, o.org_name FROM partner_invitation i
    JOIN organisation o ON o.org_id = i.org_id ORDER BY i.invited_at DESC`);
  return { invitations: list.map(i => ({ invitation_id: i.invitation_id, org_name: i.org_name, email: i.email, invited_at: i.invited_at,
    expires_at: i.expires_at, state: invitationState(i, new Date(now)) })) };
}

/** Anyone holding the link: the organisation and a masked address (no account needed to see the page). */
export function getInvitation(code, { now = nowInVietnam() } = {}) {
  const inv = getOne(`SELECT i.email, i.expires_at, i.accepted_at, o.org_name FROM partner_invitation i JOIN organisation o ON o.org_id = i.org_id
    WHERE i.code_hash = ?`, [codeHash(code)]);
  if (!inv) throw new PartnerError('NOT_FOUND');
  return { org_name: inv.org_name, email_hint: maskEmail(inv.email), state: invitationState(inv, new Date(now)) };
}

/** BR-003: the invited, signed-in account becomes partner of the organisation; the grant is audited by the inviter. */
export function acceptInvitation(session, code, { now = nowInVietnam() } = {}) {
  const userId = userOf(session);
  if (!userId) throw new PartnerError('UNAUTHENTICATED');
  return withTransaction((db) => {
    const inv = db.prepare('SELECT * FROM partner_invitation WHERE code_hash = ?').get(codeHash(code));
    if (!inv || !isOpen(inv, now)) throw new PartnerError('INVITATION_INVALID');
    const account = db.prepare('SELECT role, email FROM user_account WHERE user_id = ?').get(userId);
    if (String(account?.email || '').toLowerCase() !== inv.email) throw new PartnerError('EMAIL_MISMATCH');
    if (!['member', 'partner'].includes(account.role)) throw new PartnerError('FORBIDDEN');
    if (db.prepare('SELECT 1 AS x FROM project_member WHERE user_id = ?').get(userId)) throw new PartnerError('ALREADY_MEMBER_OF_PROJECT');
    db.prepare("UPDATE user_account SET role = 'partner' WHERE user_id = ?").run(userId);
    db.prepare('INSERT OR IGNORE INTO organisation_user (org_id, user_id, added_at) VALUES (?, ?, ?)').run(inv.org_id, userId, now);
    db.prepare('UPDATE partner_invitation SET accepted_at = ?, accepted_by = ? WHERE invitation_id = ?').run(now, userId, inv.invitation_id);
    writeAudit(db, { action: 'role.grant', adminId: inv.invited_by, targetId: userId });
    return { role: 'partner', org_id: inv.org_id, org_slug: db.prepare('SELECT slug FROM organisation WHERE org_id = ?').get(inv.org_id).slug };
  });
}

/** The active organisations VFDA can invite another account to (the invite form's list). */
export function listInvitableOrganisations(session) {
  if (!isStaff(session)) throw new PartnerError('FORBIDDEN');
  return query("SELECT org_id, org_name FROM organisation WHERE COALESCE(org_status, 'active') <> 'deactivated' ORDER BY org_name");
}
