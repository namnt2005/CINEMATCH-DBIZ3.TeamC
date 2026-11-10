import { getInvitation } from '../../../../lib/db/partner-invitations.js';
import { partnerError, fromPartnerError } from '../../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

const isCode = (v) => typeof v === 'string' && v.length >= 1 && v.length <= 128;

/** GET /api/partner-invitations/:code — anyone with the link: the organisation, a masked address and the state (BR-003). */
export async function GET(req, { params }) {
  if (!isCode(params?.code)) return partnerError('NOT_FOUND');
  try {
    return Response.json(await getInvitation(params.code));
  } catch (err) {
    return fromPartnerError(err);
  }
}
