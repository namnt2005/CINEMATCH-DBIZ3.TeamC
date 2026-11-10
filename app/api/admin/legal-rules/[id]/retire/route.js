import { retireRule } from '../../../../../../lib/db/legal-rules.js';
import { memberSession, isUuid } from '../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../lib/api/checks.js';

/** POST /api/admin/legal-rules/:id/retire — Retire (Q13, BR-008): a new rule-set version; never deleted. Only vfda_legal (D9: admin is refused). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (session.role !== 'vfda_legal') return checkError('FORBIDDEN');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await retireRule(session, params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}
