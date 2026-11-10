import { latestContentCheck } from '../../../../../../lib/db/content-checks.js';
import { memberSession, isUuid } from '../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../lib/api/checks.js';

/** GET /api/projects/:id/content-checks/latest — SC-48 for a project: the latest run and its findings (FR-013). */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await latestContentCheck(session, params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}
