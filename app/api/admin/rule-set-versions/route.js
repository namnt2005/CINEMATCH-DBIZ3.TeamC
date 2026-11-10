import { listVersions } from '../../../../lib/db/legal-rules.js';
import { memberSession } from '../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../lib/api/checks.js';

/** GET /api/admin/rule-set-versions — SC-37 #22: versions newest first with the codes signed and retired in each. */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!['vfda_legal', 'admin'].includes(session.role)) return checkError('FORBIDDEN');
  try {
    return Response.json(await listVersions(session));
  } catch (err) {
    return fromCheckError(err);
  }
}
