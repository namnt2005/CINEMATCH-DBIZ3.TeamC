import { documentLink } from '../../../../../../../lib/db/verification.js';
import { memberSession } from '../../../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../../../../lib/api/partners.js';

/** GET …/:id/document — a 60-second signed link to the business registration PDF (staff, or the organisation itself). */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  try {
    return Response.json(await documentLink(session, params.id));
  } catch (err) {
    return fromPartnerError(err);
  }
}
