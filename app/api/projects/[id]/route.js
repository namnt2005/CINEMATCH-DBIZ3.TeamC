import { getProject, updateProject } from '../../../../lib/db/projects.js';
import { validateProjectUpdate } from '../../../../lib/projects/input.js';
import { projectError, fromProjectError, memberSession, readBody, isUuid } from '../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

/** GET /api/projects/:id — the project, the caller's permission, members and the view row; 404 for non-members. */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  const project = await getProject(session, params.id);
  return project ? Response.json(project) : projectError('NOT_FOUND');
}

/** PATCH /api/projects/:id — FR-002: owner or edit; never an archived project; last write wins. */
export async function PATCH(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  const { ok, errors, value } = validateProjectUpdate(await readBody(req));
  if (!ok) return projectError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await updateProject(session, params.id, value));
  } catch (err) {
    return fromProjectError(err);
  }
}

/** BR-005: projects are archived, never deleted. */
export async function DELETE() {
  return projectError('METHOD_NOT_ALLOWED');
}
