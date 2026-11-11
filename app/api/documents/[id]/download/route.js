import { documentForDownload } from '../../../../../lib/db/documents.js';
import { memberSession, isUuid } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** GET /api/documents/:id/download — logs the view (SR-154) and answers a 60 s signed link. */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await documentForDownload(session, params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}
