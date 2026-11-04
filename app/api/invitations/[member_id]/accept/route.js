import { acceptInvitation } from '../../../../../lib/db/projects.js';
import { projectError, fromProjectError, memberSession } from '../../../../../lib/api/projects.js';

/** POST /api/invitations/:member_id/accept — D3: only the account with the invited email; 404 otherwise. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  try {
    return Response.json(await acceptInvitation(session, params.member_id));
  } catch (err) {
    return fromProjectError(err);
  }
}
