import { listMyVerification, submitVerification } from '../../../../../lib/db/verification.js';
import { validateVerificationInput } from '../../../../../lib/partners/input.js';
import { memberSession, readBody } from '../../../../../lib/api/projects.js';
import { partnerError, fromPartnerError } from '../../../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

/** GET /api/partners/me/verification — SC-22 #12: the current request and the history, newest first. */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  try {
    return Response.json(await listMyVerification(session));
  } catch (err) {
    return fromPartnerError(err);
  }
}

/** POST /api/partners/me/verification — FR-008: the uploaded PDF and two or more references; one pending at a time. */
export async function POST(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  const { ok, errors, value } = validateVerificationInput(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await submitVerification(session, value), { status: 201 });
  } catch (err) {
    return fromPartnerError(err);
  }
}
