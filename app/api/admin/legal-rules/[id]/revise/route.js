import { reviseRule } from '../../../../../../lib/db/legal-rules.js';
import { memberSession, isUuid } from '../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** POST /api/admin/legal-rules/:id/revise — Create revision (Q13): a draft copy of the signed text; the signed revision stays in force. Only vfda_legal (D9: admin is refused). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (session.role !== 'vfda_legal') return checkError('FORBIDDEN');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await reviseRule(session, params.id), { status: 201 });
  } catch (err) {
    return fromCheckError(err);
  }
}
