import { postMessage } from '../../../../../lib/db/collab.js';
import { validateMessage } from '../../../../../lib/partners/input.js';
import { memberSession, readBody } from '../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../../lib/api/partners.js';

/** POST /api/requests/:id/messages — either side, 1–2000 characters; never edited (BR-009). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  const { ok, errors, value } = validateMessage(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await postMessage(session, params.id, value), { status: 201 });
  } catch (err) {
    return fromPartnerError(err);
  }
}
