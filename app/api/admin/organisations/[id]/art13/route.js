import { setArt13 } from '../../../../../../lib/db/verification.js';
import { validateArt13 } from '../../../../../../lib/partners/input.js';
import { memberSession, isStaffSession, readBody } from '../../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../../../lib/api/partners.js';

/** POST /api/admin/organisations/:id/art13 — Q3: VFDA only; switching on needs the film-service business line confirmed. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isStaffSession(session)) return partnerError('FORBIDDEN');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  const { ok, errors, value } = validateArt13(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await setArt13(session, params.id, value));
  } catch (err) {
    return fromPartnerError(err);
  }
}
