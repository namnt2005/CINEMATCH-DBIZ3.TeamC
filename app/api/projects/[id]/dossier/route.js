import { getDossier } from '../../../../../lib/db/dossier.js';
import { memberSession, isUuid } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** GET /api/projects/:id/dossier — SC-27 (M2 FR-008, FR-009, BR-005): project members; fixed rules, no model. */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await getDossier(session, params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}
