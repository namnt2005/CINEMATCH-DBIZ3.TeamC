import { acceptInvitation } from '../../../../../lib/db/projects.js';
import { projectError, fromProjectError, memberSession, isUuid } from '../../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

/** POST /api/invitations/:member_id/accept — D3: only the account with the invited email; 404 otherwise. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.member_id)) return projectError('NOT_FOUND');
  try {
    return Response.json(await acceptInvitation(session, params.member_id));
  } catch (err) {
    return fromProjectError(err);
  }
}
