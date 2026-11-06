import { userDb, systemDb, rows } from './util.js';
import { PartnerError, rpcData } from '../../partners/errors.js';
import { todayInVietnam } from '../../partners/badge.js';
import { checkUpload, requestUpload, requestDownload } from '../../storage/org-documents.js';
import { shapeQueue } from '../../partners/verification-shape.js';
import { notifyUsers } from './partner-notify.js';
import { deliverQueued } from '../../email/resend.js';

// Supabase source of VFDA Verified (FR-008..FR-011). Writes through the SECURITY DEFINER functions of
// 20261106000200_m4_partners.sql; reads as the user (RLS: staff, or the organisation's own users); the staff list of
// the organisation's partner accounts and the notifications are the System actor's.

async function ownOrgId(session) {
  if (!session?.isAuthenticated || !session.userId) throw new PartnerError('UNAUTHENTICATED');
  if (session.role !== 'partner') throw new PartnerError('FORBIDDEN');
  const db = await userDb();
  const link = (rows(await db.from('organisation_user').select('org_id').eq('user_id', session.userId)) || [])[0];
  if (!link) throw new PartnerError('NOT_FOUND');
  return link.org_id;
}
const isStaff = (session) => ['vfda_staff', 'admin'].includes(session?.role) && Boolean(session?.userId);
async function orgUsers(orgId) {
  const system = await systemDb();
  return (rows(await system.from('organisation_user').select('user_id').eq('org_id', orgId)) || []).map(r => r.user_id);
}

export async function prepareUpload(session, file) {
  const orgId = await ownOrgId(session);
  const db = await userDb();
  const pending = rows(await db.from('verification_request').select('request_id').eq('org_id', orgId).eq('status', 'pending')) || [];
  if (pending.length) throw new PartnerError('PENDING_EXISTS');
  return requestUpload(session, orgId, file);
}

export async function submitVerification(session, { path, reference_projects: references }) {
  const orgId = await ownOrgId(session);
  if (!(await checkUpload(orgId, path)).ok) throw new PartnerError('FILE_INVALID');
  const db = await userDb();
  const out = rpcData(await db.rpc('app_submit_verification', { p_org_id: orgId, p_license_path: path, p_references: references }));
  const system = await systemDb();
  const staff = (rows(await system.from('user_account').select('user_id, role, account_status').in('role', ['vfda_staff', 'admin'])) || [])
    .filter(u => (u.account_status || 'active') === 'active').map(u => u.user_id);
  const org = rows(await system.from('organisation').select('org_name').eq('org_id', orgId).maybeSingle());
  await notifyUsers(staff, 'verification.submitted', { organisation: org?.org_name ?? null });
  return out;
}

export async function listMyVerification(session) {
  const orgId = await ownOrgId(session);
  const db = await userDb();
  const all = rows(await db.from('verification_request').select('request_id, status, submitted_at, decided_at, reason, reference_projects').eq('org_id', orgId)
    .order('submitted_at', { ascending: false })) || [];
  return { current: all.find(r => r.status === 'pending') ?? null, history: all };
}

export async function listVerificationQueue(session, { status = 'pending' } = {}, { today = todayInVietnam() } = {}) {
  if (!isStaff(session)) throw new PartnerError('FORBIDDEN');
  const db = await userDb();
  const system = await systemDb();
  const requests = rows(await db.from('verification_request').select('*')) || [];
  const orgIds = [...new Set(requests.map(r => r.org_id))];
  const orgs = orgIds.length ? rows(await system.from('organisation').select('org_id, org_name, hq_province, legal_form, founded_year, provinces, service_groups, art13_eligible').in('org_id', orgIds)) || [] : [];
  const links = orgIds.length ? rows(await system.from('organisation_user').select('org_id, user_id').in('org_id', orgIds)) || [] : [];
  const profiles = links.length ? rows(await system.from('profile').select('user_id, full_name').in('user_id', links.map(l => l.user_id))) || [] : [];
  const byOrg = Object.fromEntries(orgs.map(o => [o.org_id, o]));
  const nameOf = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
  const merged = requests.map(r => ({ ...r, ...(byOrg[r.org_id] || {}), request_id: r.request_id, org_id: r.org_id, status: r.status }));
  return shapeQueue(merged, status, today, (orgId) => links.filter(l => l.org_id === orgId).map(l => nameOf[l.user_id]).filter(Boolean));
}

export async function decideVerification(session, requestId, { decision, reason = null }) {
  const db = await userDb();
  const out = rpcData(await db.rpc('app_decide_verification', { p_request_id: requestId, p_decision: decision, p_reason: reason }));
  const system = await systemDb();
  const org = rows(await system.from('organisation').select('org_name').eq('org_id', out.org_id).maybeSingle());
  await notifyUsers(await orgUsers(out.org_id), decision === 'approved' ? 'verification.approved' : 'verification.rejected',
    decision === 'approved' ? { organisation: org?.org_name ?? null, verified_until: out.verified_until } : { organisation: org?.org_name ?? null, reason });
  return out;
}

export async function setArt13(session, orgId, { on, business_line_confirmed: confirmed = false }) {
  const db = await userDb();
  return rpcData(await db.rpc('app_set_art13', { p_org_id: orgId, p_on: on, p_business_line_confirmed: confirmed }));
}

/** The System runs the reminder function, then hands its queued emails to Resend (FR-011). */
export async function remindExpiringVerifications() {
  const system = await systemDb();
  const count = rpcData(await system.rpc('app_remind_expiring_verifications'));
  const queued = rows(await system.from('email_delivery').select('*').eq('template_id', 'verification.expiring').eq('delivery_status', 'queued')) || [];
  for (const o of await deliverQueued(queued)) {
    if (o.status !== 'queued') rows(await system.from('email_delivery').update({ delivery_status: o.status, provider_message_id: o.provider_message_id }).eq('email_delivery_id', o.email_delivery_id));
  }
  return count;
}

export async function documentLink(session, requestId) {
  const db = await userDb();
  const v = rows(await db.from('verification_request').select('org_id, business_license').eq('request_id', requestId).maybeSingle());
  if (!v) throw new PartnerError('NOT_FOUND');
  return requestDownload(session, v.business_license);
}
