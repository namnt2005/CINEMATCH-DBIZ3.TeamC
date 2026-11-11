import { deleteTerm } from '../../../../../../lib/db/glossary.js';
import { memberSession, isUuid } from '../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** DELETE /api/projects/:id/glossary/:term — owner or edit. */
export async function DELETE(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    await deleteTerm(session, params.id, decodeURIComponent(params.term || ''));
    return new Response(null, { status: 204 });
  } catch (err) {
    return fromCheckError(err);
  }
}
