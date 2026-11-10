import { getSession } from '../../../../lib/auth/session.js';
import { getProfile } from '../../../../lib/db/partners.js';
import { partnerError, fromPartnerError, isSlug } from '../../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

/** GET /api/partners/:slug — SC-20 profile (M4 FR-002..FR-004, BR-001): the layers the caller may read. */
export async function GET(req, { params }) {
  if (!isSlug(params.slug)) return partnerError('NOT_FOUND');
  try {
    const session = await getSession({ headers: req.headers });
    return Response.json(await getProfile(session, params.slug));
  } catch (err) {
    return fromPartnerError(err);
  }
}
