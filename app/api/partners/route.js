import { getSession } from '../../../lib/auth/session.js';
import { listDirectory } from '../../../lib/db/partners.js';
import { validateDirectoryQuery } from '../../../lib/partners/input.js';
import { partnerError, fromPartnerError } from '../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

/** GET /api/partners — SC-19 directory (M4 FR-002, FR-005, FR-006): public layer for everyone, member line when signed in. */
export async function GET(req) {
  const { ok, errors, value } = validateDirectoryQuery(new URL(req.url).searchParams);
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    const session = await getSession({ headers: req.headers });
    return Response.json(await listDirectory(session, value));
  } catch (err) {
    return fromPartnerError(err);
  }
}
