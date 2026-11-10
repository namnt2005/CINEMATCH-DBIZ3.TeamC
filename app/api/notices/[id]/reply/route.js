import { recordReply } from '../../../../../lib/db/notices.js';
import { validateReply } from '../../../../../lib/notices/input.js';
import { projectError, fromProjectError, memberSession, readBody, isUuid } from '../../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

/** POST /api/notices/:id/reply — M7 FR-003, BR-003: the member (owner / edit) or VFDA staff record the reply. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  const { ok, errors, value } = validateReply(await readBody(req));
  if (!ok) return projectError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await recordReply(session, params.id, value));
  } catch (err) {
    return fromProjectError(err);
  }
}
