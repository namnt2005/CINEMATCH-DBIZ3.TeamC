import { listVerificationQueue } from '../../../../lib/db/verification.js';
import { memberSession, isStaffSession } from '../../../../lib/api/projects.js';
import { partnerError, fromPartnerError } from '../../../../lib/api/partners.js';

const STATUSES = ['pending', 'approved', 'rejected', 'all'];

/** GET /api/admin/verification?status= — SC-36 (FR-009): VFDA staff and admin only. */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  if (!isStaffSession(session)) return partnerError('FORBIDDEN');
  const status = new URL(req.url).searchParams.get('status') || 'pending';
  if (!STATUSES.includes(status)) return partnerError('VALIDATION_ERROR', { fields: { status: 'verification.error.status' } });
  try {
    return Response.json(await listVerificationQueue(session, { status }));
  } catch (err) {
    return fromPartnerError(err);
  }
}
