import { listInvitations } from '../../../lib/db/projects.js';
import { projectError, memberSession } from '../../../lib/api/projects.js';

/** GET /api/invitations — D3: pending invitations addressed to the caller's account email. */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  return Response.json({ invitations: await listInvitations(session) });
}
