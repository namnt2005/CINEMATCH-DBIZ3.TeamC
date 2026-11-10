import { getSession } from '../../../../lib/auth/session.js';
import { deletionConfirmed } from '../../../../lib/auth/account-input.js';
import { deleteMyAccount } from '../../../../lib/db/accounts.js';
import { authError, authUnavailable, readJson } from '../../../../lib/api/auth.js';

export const dynamic = 'force-dynamic';

/** POST /api/account/deactivate — SC-08 *Delete my account* (BR-005, SR-233, SR-234): needs "DELETE" typed exactly. */
export async function POST(req) {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;
  const session = await getSession({ headers: req.headers });
  if (!session.isAuthenticated || !session.userId) return authError('UNAUTHENTICATED', 401);
  if (!deletionConfirmed(await readJson(req))) {
    return authError('VALIDATION_ERROR', 422, { fields: { confirm: 'account.error.confirm_delete' } });
  }
  try {
    await deleteMyAccount(session.userId);
  } catch (err) {
    console.error('Account deletion failed:', err.code || err.message);
    return authError('UNAVAILABLE', 503);
  }
  return Response.json({ status: 'deleted' });
}
