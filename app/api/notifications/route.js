import { getSession } from '../../../lib/auth/session.js';
import { listNotifications } from '../../../lib/db/notifications.js';
import { authError } from '../../../lib/api/auth.js';

/** GET /api/notifications?unread_only=&before= — SC-09 (FR-009, US-4 Scenario 2): own rows, newest first. */
export async function GET(req) {
  const session = await getSession({ headers: req.headers });
  if (!session.isAuthenticated || !session.userId) return authError('UNAUTHENTICATED', 401);
  const url = new URL(req.url);
  const result = await listNotifications(session.userId, {
    unreadOnly: url.searchParams.get('unread_only') === 'true',
    before: url.searchParams.get('before') || null
  });
  return Response.json(result);
}
