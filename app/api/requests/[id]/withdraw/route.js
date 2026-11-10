import { withdraw } from '../../../../../lib/db/collab.js';
import { validateOptionalNote } from '../../../../../lib/partners/input.js';
import { memberSession, readBody } from '../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

/** POST /api/requests/:id/withdraw — only the producer, from an open status (BR-005). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  const { ok, errors, value } = validateOptionalNote(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await withdraw(session, params.id, value));
  } catch (err) {
    return fromPartnerError(err);
  }
}
