import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam, writeAudit } from '../audit.js';
import { PartnerError } from '../../partners/errors.js';
import { verifiedUntil, todayInVietnam, daysLeft } from '../../partners/badge.js';
import { checkUpload, requestUpload, requestDownload } from '../../storage/org-documents.js';
import { userOf, isOrgUser, isStaff, orgsOfUser, asOrg } from './partner-access.js';
import { notifyUsers } from './partner-notify.js';
import { shapeQueue } from '../../partners/verification-shape.js';

// node:sqlite twin of the verification functions of 20261106000200_m4_partners.sql (FR-008..FR-011, BR-004, Q3).

const ownOrgId = (session) => {
  if (!userOf(session)) throw new PartnerError('UNAUTHENTICATED');
  if (session.role !== 'partner') throw new PartnerError('FORBIDDEN');
  const [orgId] = orgsOfUser(session);
  if (!orgId) throw new PartnerError('NOT_FOUND');
  return orgId;
};
const orgUsers = (orgId) => query('SELECT user_id FROM organisation_user WHERE org_id = ?', [orgId]).map(r => r.user_id);
const staffUsers = () => query("SELECT user_id FROM user_account WHERE role IN ('vfda_staff', 'admin') AND COALESCE(account_status, 'active') = 'active'").map(r => r.user_id);
const hasPending = (orgId) => Boolean(getOne("SELECT 1 AS x FROM verification_request WHERE org_id = ? AND status = 'pending'", [orgId]));

/** SC-22: a signed upload URL, once no request is pending (SR-332). */
export async function prepareUpload(session, file) {
  const orgId = ownOrgId(session);
  if (hasPending(orgId)) throw new PartnerError('PENDING_EXISTS');
  return requestUpload(session, orgId, file);
}

export async function submitVerification(session, { path, reference_projects: references }, { now = nowInVietnam() } = {}) {
  if (!userOf(session)) throw new PartnerError('UNAUTHENTICATED');
  if (session.role !== 'partner') throw new PartnerError('FORBIDDEN');
  const orgId = orgsOfUser(session)[0];
  if (!orgId || !isOrgUser(session, orgId)) throw new PartnerError('FORBIDDEN');
  const org = asOrg(getOne('SELECT * FROM organisation WHERE org_id = ?', [orgId]));
  if (org.org_status === 'deactivated') throw new PartnerError('ORG_DEACTIVATED');
  if (hasPending(orgId)) throw new PartnerError('PENDING_EXISTS');
  const refs = (references || []).map(r => String(r || '').trim()).filter(Boolean);
  if (!(await checkUpload(orgId, path)).ok) throw new PartnerError('FILE_INVALID');
  if (refs.length < 2) throw new PartnerError('VALIDATION_ERROR');
  const id = randomUUID();
  query(`INSERT INTO verification_request (request_id, org_id, business_license, reference_projects, status, decided_by, reason, submitted_at, decided_at)
    VALUES (?, ?, ?, ?, 'pending', NULL, NULL, ?, NULL)`, [id, orgId, path, JSON.stringify(refs), now]);
  await notifyUsers(staffUsers(), 'verification.submitted', { organisation: org.org_name });
  return { verification_request_id: id, status: 'pending', submitted_at: now };
}

export async function listMyVerification(session) {
  const orgId = ownOrgId(session);
  const all = query('SELECT request_id, status, submitted_at, decided_at, reason, reference_projects FROM verification_request WHERE org_id = ? ORDER BY submitted_at DESC', [orgId])
    .map(r => ({ ...r, reference_projects: JSON.parse(r.reference_projects || '[]'), decided_at: r.decided_at || null, reason: r.reason || null }));
  return { current: all.find(r => r.status === 'pending') ?? null, history: all };
}

export async function listVerificationQueue(session, { status = 'pending' } = {}, { today = todayInVietnam() } = {}) {
  if (!isStaff(session)) throw new PartnerError('FORBIDDEN');
  const rows = query('SELECT v.*, o.org_name, o.hq_province, o.legal_form, o.founded_year, o.provinces, o.service_groups, o.art13_eligible FROM verification_request v JOIN organisation o ON o.org_id = v.org_id');
  return shapeQueue(rows.map(r => ({ ...r, decided_at: r.decided_at || null, reason: r.reason || null })), status, today,
    (orgId) => query('SELECT p.full_name FROM organisation_user ou LEFT JOIN profile p ON p.user_id = ou.user_id WHERE ou.org_id = ?', [orgId]).map(x => x.full_name).filter(Boolean));
}

export async function decideVerification(session, requestId, { decision, reason = null }, { now = nowInVietnam() } = {}) {
  if (!isStaff(session)) throw new PartnerError('FORBIDDEN');
  if (!['approved', 'rejected'].includes(decision)) throw new PartnerError('VALIDATION_ERROR');
  const text = String(reason || '').trim();
  if (decision === 'rejected' && (text.length < 1 || text.length > 1000)) throw new PartnerError('VALIDATION_ERROR');
  const v = getOne('SELECT * FROM verification_request WHERE request_id = ?', [requestId]);
  if (!v) throw new PartnerError('NOT_FOUND');
  if (v.status !== 'pending') throw new PartnerError('INVALID_STATE');
  const until = decision === 'approved' ? verifiedUntil(now) : null;
  withTransaction((db) => {
    db.prepare('UPDATE verification_request SET status = ?, decided_by = ?, decided_at = ?, reason = ? WHERE request_id = ?')
      .run(decision, userOf(session), now, decision === 'rejected' ? text : null, requestId);
    if (until) db.prepare('UPDATE organisation SET verified_at = ?, verified_until = ? WHERE org_id = ?').run(now, until, v.org_id);
    writeAudit(db, { action: decision === 'approved' ? 'org.verify.approve' : 'org.verify.reject', adminId: userOf(session), targetId: requestId });
  });
  const orgName = getOne('SELECT org_name FROM organisation WHERE org_id = ?', [v.org_id])?.org_name ?? null;
  await notifyUsers(orgUsers(v.org_id), decision === 'approved' ? 'verification.approved' : 'verification.rejected',
    decision === 'approved' ? { organisation: orgName, verified_until: until } : { organisation: orgName, reason: text });
  return { org_id: v.org_id, status: decision, decided_at: now, verified_at: until ? now : null, verified_until: until };
}

export async function setArt13(session, orgId, { on, business_line_confirmed: confirmed = false } = {}) {
  if (!isStaff(session)) throw new PartnerError('FORBIDDEN');
  if (!getOne('SELECT 1 AS x FROM organisation WHERE org_id = ?', [orgId])) throw new PartnerError('NOT_FOUND');
  if (typeof on !== 'boolean' || (on && confirmed !== true)) throw new PartnerError('VALIDATION_ERROR');
  withTransaction((db) => {
    db.prepare('UPDATE organisation SET art13_eligible = ? WHERE org_id = ?').run(on ? 'true' : 'false', orgId);
    writeAudit(db, { action: on ? 'organisation.art13_on' : 'organisation.art13_off', adminId: userOf(session), targetId: orgId });
  });
  return { org_id: orgId, art13_eligible: on };
}

/** FR-011: the users of each active organisation whose badge ends within 30 days, once per badge. */
export async function remindExpiringVerifications({ today = todayInVietnam() } = {}) {
  let count = 0;
  for (const org of query("SELECT * FROM organisation WHERE COALESCE(org_status, 'active') = 'active' AND verified_until IS NOT NULL AND verified_until <> ''").map(asOrg)) {
    const left = daysLeft(org, today);
    if (left < 0 || left > 30) continue;
    const users = orgUsers(org.org_id);
    if (!users.length) continue;
    const done = users.some(u => query("SELECT payload FROM notification WHERE recipient_id = ? AND event_type = 'verification.expiring'", [u])
      .some(n => JSON.parse(n.payload || '{}').verified_until === org.verified_until));
    if (done) continue;
    await notifyUsers(users, 'verification.expiring', { organisation: org.org_name, verified_until: org.verified_until, days_left: left });
    count += 1;
  }
  return count;
}

/** SC-36 #7 / SC-22 #12: a signed link to one request's file, for staff or the organisation's own users. */
export async function documentLink(session, requestId) {
  const v = getOne('SELECT org_id, business_license FROM verification_request WHERE request_id = ?', [requestId]);
  if (!v || (!isStaff(session) && !isOrgUser(session, v.org_id))) throw new PartnerError('NOT_FOUND');
  return requestDownload(session, v.business_license);
}
