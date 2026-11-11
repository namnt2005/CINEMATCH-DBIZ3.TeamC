import { getKit, recordDocument } from '../../../../../lib/db/documents.js';
import { memberSession, isUuid } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** GET /api/projects/:id/documents?segment= — SC-26 (M5 FR-001, FR-003): the document kit; another segment is read-only. */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await getKit(session, params.id, { segment: new URL(req.url).searchParams.get('segment') }));
  } catch (err) {
    return fromCheckError(err);
  }
}

/** POST /api/projects/:id/documents { doc_code, path } — records the version the browser uploaded (M5 FR-002). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return checkError('VALIDATION_ERROR');
  try {
    return Response.json(await recordDocument(session, params.id, body), { status: 201 });
  } catch (err) {
    return fromCheckError(err);
  }
}
