import { getTimeline } from '../../../../../lib/db/timeline.js';
import { memberSession, isUuid } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:id/countdown?submit= — M5 FR-008 `timeline_view` (specs/009-m5-dossier, contracts/countdown-api):
 * exactly M2's getTimeline(), the one calculation SC-29, SC-27 and the SC-12 strip use (BR-005). No date is counted here.
 */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const submit = new URL(req.url).searchParams.get('submit');
  if (submit && !/^\d{4}-\d{2}-\d{2}$/.test(submit)) return checkError('VALIDATION_ERROR', { fields: { submit: 'timeline.error.submit' } });
  try {
    return Response.json({ timeline_view: await getTimeline(session, params.id, submit ? { submit } : {}) });
  } catch (err) {
    return fromCheckError(err);
  }
}
