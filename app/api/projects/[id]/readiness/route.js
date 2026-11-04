import { getReadiness } from '../../../../../lib/db/readiness.js';
import { projectError, memberSession } from '../../../../../lib/api/projects.js';

/** GET /api/projects/:id/readiness — FR-005: the view row for a member; 503 when the view fails (US-2 Scenario 3). */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  let row;
  try {
    row = await getReadiness(params.id, session);
  } catch {
    return projectError('READINESS_UNAVAILABLE');
  }
  return row ? Response.json(row) : projectError('NOT_FOUND');
}
