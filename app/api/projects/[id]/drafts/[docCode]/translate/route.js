import { translateDraft } from '../../../../../../../lib/db/drafts.js';
import { memberSession, isUuid } from '../../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** POST …/translate { idx?, consent? } — retry one paragraph or every empty one; 409 without the paid plan and the tick (Q3). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const body = await req.json().catch(() => ({}));
  const idx = body?.idx == null ? null : Number(body.idx);
  if (idx !== null && !Number.isInteger(idx)) return checkError('VALIDATION_ERROR');
  try {
    return Response.json(await translateDraft(session, params.id, params.docCode, { idx, consent: body?.consent === true }));
  } catch (err) {
    return fromCheckError(err);
  }
}
