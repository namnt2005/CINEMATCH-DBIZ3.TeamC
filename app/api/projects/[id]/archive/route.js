import { archiveProject } from '../../../../../lib/db/projects.js';
import { projectError, fromProjectError, memberSession } from '../../../../../lib/api/projects.js';

/** POST /api/projects/:id/archive — BR-005: owner or edit; read-only afterwards, nothing deleted. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  try {
    return Response.json(await archiveProject(session, params.id));
  } catch (err) {
    return fromProjectError(err);
  }
}
