import { listDrafts } from '../../../../../lib/db/drafts.js';
import { memberSession, isUuid } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** GET /api/projects/:id/drafts — the SC-28 picker: the project's drafts, A13_SCRIPT_VI first (M5 FR-004). */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await listDrafts(session, params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}
