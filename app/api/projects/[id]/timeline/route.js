import { getTimeline } from '../../../../../lib/db/timeline.js';
import { memberSession, isUuid } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

/** GET /api/projects/:id/timeline?submit= — SC-29 (M2 FR-017, FR-018, BR-006): project members. */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const submit = new URL(req.url).searchParams.get('submit');
  if (submit && !/^\d{4}-\d{2}-\d{2}$/.test(submit)) return checkError('VALIDATION_ERROR', { fields: { submit: 'timeline.error.submit' } });
  try {
    return Response.json(await getTimeline(session, params.id, submit ? { submit } : {}));
  } catch (err) {
    return fromCheckError(err);
  }
}
