import { reviewFinding } from '../../../../../lib/db/content-checks.js';
import { memberSession, isUuid, readBody } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

/** POST /api/content-findings/:id/review — FR-014: owner or edit marks a finding reviewed, with an optional note. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const body = await readBody(req);
  try {
    return Response.json(await reviewFinding(session, params.id, { note: body.note }));
  } catch (err) {
    return fromCheckError(err);
  }
}
