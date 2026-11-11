import { confirmDraft } from '../../../../../../../lib/db/drafts.js';
import { memberSession, isUuid } from '../../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** POST …/confirm — the confirmed partner (both NDA rows) marks every remaining paragraph proofread (D4). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await confirmDraft(session, params.id, params.docCode));
  } catch (err) {
    return fromCheckError(err);
  }
}
