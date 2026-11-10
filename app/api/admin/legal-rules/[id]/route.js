import { getRule, saveDraft } from '../../../../../lib/db/legal-rules.js';
import { memberSession, readBody, isUuid } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';
import { validateRule } from '../../../../../lib/legal/input.js';

/** GET /api/admin/legal-rules/:id — one revision with the code's other revisions (vfda_legal, admin). */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!['vfda_legal', 'admin'].includes(session.role)) return checkError('FORBIDDEN');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await getRule(session, params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}

/** PATCH /api/admin/legal-rules/:id — edit a draft revision (FR-002); approved and retired revisions are read-only. */
export async function PATCH(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (session.role !== 'vfda_legal') return checkError('FORBIDDEN');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const body = await readBody(req);
  const { rule_code: _ignored, ...fields } = body;
  const checked = validateRule(fields);
  if (!checked.ok) return checkError('VALIDATION_ERROR', { fields: checked.errors });
  try {
    return Response.json(await saveDraft(session, params.id, fields));
  } catch (err) {
    return fromCheckError(err);
  }
}
