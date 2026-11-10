import { sendRequest, listRequests } from '../../../lib/db/collab.js';
import { validateRequestInput } from '../../../lib/partners/input.js';
import { memberSession, readBody } from '../../../lib/api/projects.js';
import { partnerError, fromPartnerError, isUuidLike } from '../../../lib/api/partners.js';

export const dynamic = 'force-dynamic';

/** POST /api/requests — SC-23 send (M4 FR-012): a producer of the project; one open request per project and partner. */
export async function POST(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  const { ok, errors, value } = validateRequestInput(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await sendRequest(session, value), { status: 201 });
  } catch (err) {
    return fromPartnerError(err);
  }
}

/** GET /api/requests?project_id= | ?direction=outgoing (member) | ?direction=incoming (partner) — FR-013. */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  const params = new URL(req.url).searchParams;
  const projectId = params.get('project_id');
  const direction = params.get('direction');
  if (projectId && !isUuidLike(projectId)) return partnerError('NOT_FOUND');
  if (!projectId && !['incoming', 'outgoing'].includes(direction)) return partnerError('VALIDATION_ERROR', { fields: { direction: 'requests.error.direction' } });
  try {
    return Response.json(await listRequests(session, projectId ? { project_id: projectId } : { direction }));
  } catch (err) {
    return fromPartnerError(err);
  }
}
