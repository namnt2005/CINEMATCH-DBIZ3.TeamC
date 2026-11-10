import { createInvitation, listInvitations } from '../../../../lib/db/partner-invitations.js';
import { sendPartnerInvitation } from '../../../../lib/email/resend.js';
import { memberSession, isStaffSession, readBody } from '../../../../lib/api/projects.js';
import { siteOrigin } from '../../../../lib/api/auth.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../lib/api/partners.js';
import { validateInvitationEmail, validateOrganisationFields } from '../../../../lib/partners/input.js';

export const dynamic = 'force-dynamic';

const EMAIL = { sent: 'sent', queued: 'queued', bounced: 'failed' };

/**
 * POST /api/admin/partner-invitations — vfda_staff and admin invite a partner (BR-003, SYS BR-002 as changed 06/11/2026).
 * The one-time code goes only into the email link; it is never in the answer or a log line.
 */
export async function POST(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isStaffSession(session)) return partnerError('FORBIDDEN');
  const body = await readBody(req);
  const fields = {};
  const email = validateInvitationEmail(body.email);
  if (!email.ok) Object.assign(fields, email.errors);
  if (body.org_id) {
    if (!isUuidLike(body.org_id)) fields.org_id = 'invitations.error.org';
  } else {
    const org = validateOrganisationFields(body.org);
    if (!org.ok) Object.assign(fields, org.errors);
  }
  if (Object.keys(fields).length) return partnerError('VALIDATION_ERROR', { fields });
  let created;
  try {
    created = await createInvitation(session, body.org_id ? { org_id: body.org_id, email: email.value } : { org: body.org, email: email.value });
  } catch (err) {
    return fromPartnerError(err);
  }
  const { code, org_name: orgName, ...invitation } = created;
  const sent = await sendPartnerInvitation({ email: email.value, org_name: orgName, link: `${siteOrigin(req)}/invitations/partner/${code}`,
    expires_at: invitation.expires_at });
  return Response.json({ ...invitation, email: EMAIL[sent.status] }, { status: 201 });
}

/** GET /api/admin/partner-invitations — the invitations and their state (open, accepted, expired). */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isStaffSession(session)) return partnerError('FORBIDDEN');
  try {
    return Response.json(await listInvitations(session));
  } catch (err) {
    return fromPartnerError(err);
  }
}
