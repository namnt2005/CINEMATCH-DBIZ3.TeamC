import { reviewParagraph } from '../../../../../../../../../lib/db/drafts.js';
import { memberSession, isUuid } from '../../../../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** POST …/paragraphs/:idx/review — ✓ Proofread (FR-006): records who and when; the last one makes component b present (BR-002). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  const idx = Number(params?.idx);
  if (!isUuid(params?.id) || !Number.isInteger(idx) || idx < 1) return checkError('NOT_FOUND');
  try {
    return Response.json(await reviewParagraph(session, params.id, params.docCode, idx));
  } catch (err) {
    return fromCheckError(err);
  }
}
