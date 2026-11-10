import { requestConsultation, listConsultations, getMemberContact, recordConsultationEmail } from '../../../lib/db/consultations.js';
import { validateConsultationRequest } from '../../../lib/consultations/input.js';
import { sendConsultationRequest } from '../../../lib/email/resend.js';
import { projectError, fromProjectError, memberSession, readBody } from '../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

const ANSWER = { sent: 'sent', bounced: 'failed', queued: 'queued' };

/**
 * POST /api/consultations — M7 FR-005, BR-005, R8: store the request first, then email it to VFDA once.
 * An email failure never loses the request: the answer says `failed` (or `queued` when email is not set up).
 */
export async function POST(req) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  const { ok, errors, value } = validateConsultationRequest(await readBody(req));
  if (!ok) return projectError('VALIDATION_ERROR', { fields: errors });
  let bookingId;
  try {
    ({ booking_id: bookingId } = await requestConsultation(session, value));
  } catch (err) {
    return fromProjectError(err);
  }
  const member = (await getMemberContact(session.userId).catch(() => null)) || { email: null };
  const outcome = await sendConsultationRequest({ request: { ...value, booking_id: bookingId }, member });
  const recipient = process.env.VFDA_CONSULT_EMAIL;
  if (recipient) {
    await recordConsultationEmail({ booking_id: bookingId, recipient_email: recipient, delivery_status: outcome.status, provider_message_id: outcome.provider_message_id })
      .catch(err => console.warn(`[email] consultation request ${bookingId}: delivery not recorded (${err?.code || 'error'})`));
  }
  return Response.json({ booking_id: bookingId, email: ANSWER[outcome.status] }, { status: 201 });
}

/** GET /api/consultations — the caller's own requests, upcoming first. */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  try {
    return Response.json(await listConsultations(session));
  } catch (err) {
    return fromProjectError(err);
  }
}
