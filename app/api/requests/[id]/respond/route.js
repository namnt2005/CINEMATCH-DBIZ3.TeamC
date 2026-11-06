import { respond } from '../../../../../lib/db/collab.js';
import { validateResponse } from '../../../../../lib/partners/input.js';
import { memberSession, readBody } from '../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../../lib/api/partners.js';

/** POST /api/requests/:id/respond — only the partner (BR-005); accepting needs its NDA; a note becomes a message (BR-009). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  const { ok, errors, value } = validateResponse(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await respond(session, params.id, value));
  } catch (err) {
    return fromPartnerError(err);
  }
}
