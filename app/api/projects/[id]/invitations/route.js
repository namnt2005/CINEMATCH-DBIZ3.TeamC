import { inviteMember } from '../../../../../lib/db/projects.js';
import { validateInvite } from '../../../../../lib/projects/input.js';
import { projectError, fromProjectError, memberSession, readBody, isUuid } from '../../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

/** POST /api/projects/:id/invitations — FR-004: owner only, view or edit; the email is queued (D3). */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  const { ok, errors, value } = validateInvite(await readBody(req));
  if (!ok) return projectError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await inviteMember(session, params.id, value), { status: 201 });
  } catch (err) {
    return fromProjectError(err);
  }
}
