import { expressInterest } from '../../../../../lib/db/notices.js';
import { projectError, fromProjectError, memberSession, readBody, isUuid } from '../../../../../lib/api/projects.js';

/** POST /api/projects/:id/interests — M7 FR-001: the interest and the province's notice draft (D5). The summary is never read from the body. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  const { location_id: locationId } = await readBody(req);
  if (!isUuid(locationId)) return projectError('VALIDATION_ERROR', { fields: { location_id: 'notices.error.location_invalid' } });
  try {
    return Response.json(await expressInterest(session, params.id, { location_id: locationId }), { status: 201 });
  } catch (err) {
    return fromProjectError(err);
  }
}
