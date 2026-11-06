import { decideVerification } from '../../../../../../lib/db/verification.js';
import { validateDecision } from '../../../../../../lib/partners/input.js';
import { memberSession, isStaffSession, readBody } from '../../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../../../../lib/api/partners.js';

/** POST /api/admin/verification/:id/decision — FR-010, BR-004: approve, or reject with a reason; one audit row. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isStaffSession(session)) return partnerError('FORBIDDEN');
  if (!isUuidLike(params.id)) return partnerError('NOT_FOUND');
  const { ok, errors, value } = validateDecision(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await decideVerification(session, params.id, value));
  } catch (err) {
    return fromPartnerError(err);
  }
}
