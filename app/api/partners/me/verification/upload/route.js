import { prepareUpload } from '../../../../../../lib/db/verification.js';
import { validateUploadRequest } from '../../../../../../lib/partners/input.js';
import { memberSession, readBody } from '../../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError } from '../../../../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

/** POST /api/partners/me/verification/upload — a signed upload URL into org-documents (R10); PDF ≤ 25 MB. */
export async function POST(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  const { ok, errors, value } = validateUploadRequest(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await prepareUpload(session, value));
  } catch (err) {
    return fromPartnerError(err);
  }
}
