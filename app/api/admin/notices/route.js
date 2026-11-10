import { listStaffNotices } from '../../../../lib/db/notices.js';
import { projectError, fromProjectError, memberSession, isStaffSession } from '../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

const STATUSES = ['draft', 'submitted', 'changes_requested', 'approved'];

/** GET /api/admin/notices?status= — M7 R6: the VFDA review queue (vfda_staff, admin). */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isStaffSession(session)) return projectError('FORBIDDEN');
  const status = new URL(req.url).searchParams.get('status') || 'submitted';
  if (!STATUSES.includes(status)) return projectError('VALIDATION_ERROR', { fields: { status: 'notices.error.status_invalid' } });
  try {
    return Response.json(await listStaffNotices(session, { status }));
  } catch (err) {
    return fromProjectError(err);
  }
}
