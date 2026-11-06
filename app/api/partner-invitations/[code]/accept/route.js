import { acceptInvitation } from '../../../../../lib/db/partner-invitations.js';
import { memberSession } from '../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError } from '../../../../../lib/api/partners.js';

/** POST /api/partner-invitations/:code/accept — the invited, signed-in account becomes partner (BR-003, SYS BR-002). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (typeof params?.code !== 'string' || params.code.length > 128) return partnerError('INVITATION_INVALID');
  try {
    const { role, org_slug: orgSlug } = await acceptInvitation(session, params.code);
    return Response.json({ role, org_slug: orgSlug });
  } catch (err) {
    return fromPartnerError(err);
  }
}
