// Who may see and do what in M4 on node:sqlite — the twins of app.is_org_user, app.project_permission and the
// read policies of tools/rls_policies.py (specs/007-m4-partners research R3, R4).
import { query, getOne } from '../client.js';

export const userOf = (session) => (session?.isAuthenticated && session.userId ? session.userId : null);
const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true';
const json = (v, fallback) => (v === null || v === undefined || v === '' ? fallback : typeof v === 'string' ? JSON.parse(v) : v);

/** The caller acts for the organisation (role partner + organisation_user, D1). */
export function isOrgUser(session, orgId) {
  const userId = userOf(session);
  if (!userId || session.role !== 'partner') return false;
  return Boolean(getOne('SELECT 1 AS ok FROM organisation_user WHERE org_id = ? AND user_id = ?', [orgId, userId]));
}

/** The organisations the caller acts for. */
export const orgsOfUser = (session) => (userOf(session) && session.role === 'partner'
  ? query('SELECT org_id FROM organisation_user WHERE user_id = ?', [userOf(session)]).map(r => r.org_id) : []);

export const isStaff = (session) => ['vfda_staff', 'admin'].includes(session?.role) && Boolean(userOf(session));

/** owner, edit, view or null (accepted members only). */
export function permissionOf(session, projectId) {
  const userId = userOf(session);
  if (!userId) return null;
  return getOne("SELECT permission FROM project_member WHERE project_id = ? AND user_id = ? AND invite_status = 'accepted'", [projectId, userId])?.permission ?? null;
}

export const isProjectMember = (session, projectId) => Boolean(permissionOf(session, projectId));

/** Both parties accepted the NDA on this request (R7). */
export function ndaOf(requestId) {
  const rows = query('SELECT party, accepted FROM nda_acceptance WHERE request_id = ?', [requestId]);
  return { producer: rows.some(r => r.party === 'producer' && truthy(r.accepted)), partner: rows.some(r => r.party === 'partner' && truthy(r.accepted)) };
}

/** The twin of rls_org_private_after_nda and rls_org_private_own (BR-001). */
export function canReadPrivate(session, orgId) {
  if (isOrgUser(session, orgId)) return true;
  if (!userOf(session)) return false;
  return query("SELECT request_id, project_id FROM collab_request WHERE org_id = ? AND status IN ('accepted', 'confirmed')", [orgId])
    .some(r => isProjectMember(session, r.project_id) && ndaOf(r.request_id).producer && ndaOf(r.request_id).partner);
}

/** An organisation row with its JSON columns read. */
export function asOrg(row) {
  if (!row) return null;
  return { ...row, service_groups: json(row.service_groups, []), provinces: json(row.provinces, []).map(Number),
    art13_eligible: truthy(row.art13_eligible), founded_year: row.founded_year === '' || row.founded_year == null ? null : Number(row.founded_year),
    hq_province: row.hq_province === '' || row.hq_province == null ? null : Number(row.hq_province),
    verified_at: row.verified_at || null, verified_until: row.verified_until || null, org_status: row.org_status || 'active' };
}

export function asMemberLayer(row) {
  if (!row) return null;
  return { ...row, portfolio: json(row.portfolio, []), working_languages: json(row.working_languages, []), intl_project_count: Number(row.intl_project_count || 0) };
}
