import { getReadiness } from '../../../../../lib/db/readiness.js';
import { toApiReadiness } from '../../../../../lib/db/project-shape.js';
import { projectError, memberSession, isUuid } from '../../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:id/readiness — FR-005: the view row for a member, as gauge_scores and next_actions (spec
 * names, decision H3); 503 when the view fails (US-2 Scenario 3).
 */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  let row;
  try {
    row = await getReadiness(params.id, session);
  } catch {
    return projectError('READINESS_UNAVAILABLE');
  }
  return row ? Response.json(toApiReadiness(row)) : projectError('NOT_FOUND');
}
