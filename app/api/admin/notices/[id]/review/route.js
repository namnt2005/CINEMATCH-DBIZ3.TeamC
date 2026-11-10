import { reviewNotice } from '../../../../../../lib/db/notices.js';
import { validateReview } from '../../../../../../lib/notices/input.js';
import { projectError, fromProjectError, memberSession, readBody, isUuid, isStaffSession } from '../../../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

/** POST /api/admin/notices/:id/review — M7 R6, BR-001: approve or request changes; one audit row each. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isStaffSession(session)) return projectError('FORBIDDEN');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  const { ok, errors, value } = validateReview(await readBody(req));
  if (!ok) return projectError(errors.note === 'notices.error.note_required' ? 'NOTE_REQUIRED' : 'VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await reviewNotice(session, params.id, value));
  } catch (err) {
    return fromProjectError(err);
  }
}
