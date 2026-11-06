import { acceptNda } from '../../../../../lib/db/collab.js';
import { validateNdaInput } from '../../../../../lib/partners/input.js';
import { NDA_VERSION } from '../../../../../lib/partners/nda.js';
import { memberSession, readBody } from '../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../../lib/api/partners.js';

/** POST /api/requests/:id/nda — the producer's NDA on an accepted request (FR-017); it opens the private layer (R7). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  const { ok, errors, value } = validateNdaInput(await readBody(req), NDA_VERSION);
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await acceptNda(session, params.id, { ...value, accepted: true }));
  } catch (err) {
    return fromPartnerError(err);
  }
}
