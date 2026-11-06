import { getRequest } from '../../../../lib/db/collab.js';
import { memberSession } from '../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../lib/api/partners.js';

/** GET /api/requests/:id — SC-25 (M4 FR-013, FR-014): the project's members and the partner's users. */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  try {
    return Response.json(await getRequest(session, params.id));
  } catch (err) {
    return fromPartnerError(err);
  }
}
