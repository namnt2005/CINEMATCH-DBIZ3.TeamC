import { getSession } from '../../../../lib/auth/session.js';
import { markRead, readTarget } from '../../../../lib/db/notifications.js';
import { authError, readJson } from '../../../../lib/api/auth.js';

/** POST /api/notifications/read — { ids: [...] } or { all: true }; only read_at of the user's own rows (FR-009). */
export async function POST(req) {
  const session = await getSession({ headers: req.headers });
  if (!session.isAuthenticated || !session.userId) return authError('UNAUTHENTICATED', 401);
  const target = readTarget(await readJson(req));
  if (!target) return authError('VALIDATION_ERROR', 422, { fields: { ids: 'notifications.error.ids' } });
  return Response.json(await markRead(session.userId, target));
}
