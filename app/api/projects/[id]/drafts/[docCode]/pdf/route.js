import { exportPdf } from '../../../../../../../lib/db/drafts.js';
import { memberSession, isUuid } from '../../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** POST …/pdf — the two-column PDF, watermarked on every page (BR-001), stored in project-documents; a 60 s link. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await exportPdf(session, params.id, params.docCode));
  } catch (err) {
    return fromCheckError(err);
  }
}
