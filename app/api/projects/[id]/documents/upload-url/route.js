import { requestUpload } from '../../../../../../lib/db/documents.js';
import { memberSession, isUuid } from '../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** POST /api/projects/:id/documents/upload-url { doc_code, filename, content_type, size } — a 300 s signed upload URL (M5 FR-002, R3). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return checkError('VALIDATION_ERROR');
  try {
    return Response.json(await requestUpload(session, params.id, body));
  } catch (err) {
    return fromCheckError(err);
  }
}
