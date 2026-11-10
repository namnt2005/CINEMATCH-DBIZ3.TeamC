import { confirm } from '../../../../../lib/db/collab.js';
import { memberSession } from '../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

/** POST /api/requests/:id/confirm — only the producer, from accepted, after its NDA (BR-005); no dossier write (BR-006). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  try {
    return Response.json(await confirm(session, params.id));
  } catch (err) {
    return fromPartnerError(err);
  }
}
