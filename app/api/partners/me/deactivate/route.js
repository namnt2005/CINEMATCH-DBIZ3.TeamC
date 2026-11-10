import { deactivateOrg } from '../../../../../lib/db/partners.js';
import { memberSession, readBody } from '../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError } from '../../../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

/** POST /api/partners/me/deactivate — BR-008: the exact name, then deactivated, open requests withdrawn, nothing deleted. */
export async function POST(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  const body = await readBody(req);
  const typed = typeof body.typed_name === 'string' ? body.typed_name.trim() : '';
  if (!typed) return partnerError('VALIDATION_ERROR', { fields: { typed_name: 'org.error.typed_name' } });
  try {
    return Response.json(await deactivateOrg(session, { typed_name: typed }));
  } catch (err) {
    return fromPartnerError(err);
  }
}
