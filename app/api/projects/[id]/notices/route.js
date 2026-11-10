import { listNotices } from '../../../../../lib/db/notices.js';
import { projectError, fromProjectError, memberSession, isUuid } from '../../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

/** GET /api/projects/:id/notices — M7 FR-004: one notice per province, for members of the project. */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  try {
    return Response.json(await listNotices(session, params.id));
  } catch (err) {
    return fromProjectError(err);
  }
}
