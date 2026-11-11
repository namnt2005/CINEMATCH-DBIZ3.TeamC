import { editParagraph } from '../../../../../../../../lib/db/drafts.js';
import { memberSession, isUuid } from '../../../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** PATCH …/paragraphs/:idx { target_text } — autosave of SC-28 #6; a proofread paragraph goes back to not proofread (SR-163). */
export async function PATCH(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  const idx = Number(params?.idx);
  if (!isUuid(params?.id) || !Number.isInteger(idx) || idx < 1) return checkError('NOT_FOUND');
  const body = await req.json().catch(() => null);
  if (!body || typeof body.target_text !== 'string') return checkError('VALIDATION_ERROR', { fields: { target_text: 'drafts.error.target' } });
  try {
    return Response.json(await editParagraph(session, params.id, params.docCode, idx, body.target_text));
  } catch (err) {
    return fromCheckError(err);
  }
}
