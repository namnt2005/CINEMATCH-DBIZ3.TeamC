import { listTerms, saveTerm } from '../../../../../lib/db/glossary.js';
import { memberSession, isUuid } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** GET /api/projects/:id/glossary — the project glossary (M5 BR-006). */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await listTerms(session, params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}

/** POST /api/projects/:id/glossary { term_en, term_vi } — owner or edit; one translation per term. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return checkError('VALIDATION_ERROR');
  try {
    return Response.json(await saveTerm(session, params.id, body), { status: 201 });
  } catch (err) {
    return fromCheckError(err);
  }
}
