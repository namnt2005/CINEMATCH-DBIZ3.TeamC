import { submitNotice } from '../../../../../lib/db/notices.js';
import { projectError, fromProjectError, memberSession, isUuid } from '../../../../../lib/api/projects.js';

/** POST /api/notices/:id/submit — M7 R1: ask VFDA to review (needs a first shooting day, US-1 Scenario 2). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  try {
    return Response.json(await submitNotice(session, params.id));
  } catch (err) {
    return fromProjectError(err);
  }
}
