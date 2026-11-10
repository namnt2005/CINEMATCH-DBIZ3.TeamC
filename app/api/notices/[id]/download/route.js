import { markDownloaded } from '../../../../../lib/db/notices.js';
import { validateRecipient } from '../../../../../lib/notices/input.js';
import { projectError, fromProjectError, memberSession, readBody, isUuid } from '../../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

/** POST /api/notices/:id/download — M7 D7: owner / edit record the first download and the recipient. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  const { recipient } = await readBody(req);
  const check = validateRecipient(recipient);
  if (!check.ok) return projectError('VALIDATION_ERROR', { fields: { recipient: check.error } });
  try {
    return Response.json(await markDownloaded(session, params.id, { recipient }));
  } catch (err) {
    return fromProjectError(err);
  }
}
