import { signRule } from '../../../../../../lib/db/legal-rules.js';
import { memberSession, isUuid } from '../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** POST /api/admin/legal-rules/:id/sign — Approve and sign (FR-003, FR-004, BR-002): the database CHECK refuses a rule without a citation. Only vfda_legal (D9: admin is refused). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (session.role !== 'vfda_legal') return checkError('FORBIDDEN');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await signRule(session, params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}
