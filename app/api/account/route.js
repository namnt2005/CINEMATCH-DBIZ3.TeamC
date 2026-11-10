import { getSession } from '../../../lib/auth/session.js';
import { validateAccountPatch } from '../../../lib/auth/account-input.js';
import { getAccount, updateAccount } from '../../../lib/db/accounts.js';
import { authError, authUnavailable, readJson } from '../../../lib/api/auth.js';
import { localeCookie } from '../../../lib/i18n/switch.js';

export const dynamic = 'force-dynamic';

async function signedInUser(req) {
  const session = await getSession({ headers: req.headers });
  return session.isAuthenticated && session.userId ? session.userId : null;
}

/** GET /api/account — SC-08: email and role read-only (SR-231, SR-232), accepted versions (SR-235). */
export async function GET(req) {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;
  const userId = await signedInUser(req);
  if (!userId) return authError('UNAUTHENTICATED', 401);
  const account = await getAccount(userId);
  return account ? Response.json(account) : authError('UNAUTHENTICATED', 401);
}

/** PATCH /api/account — SC-08 *Save changes* and the language choice (FR-005: the cookie follows). */
export async function PATCH(req) {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;
  const userId = await signedInUser(req);
  if (!userId) return authError('UNAUTHENTICATED', 401);
  const body = await readJson(req);
  if (!body) return authError('INVALID_JSON', 400);
  const { ok, errors, profile, organisation } = validateAccountPatch(body);
  if (!ok) return authError('VALIDATION_ERROR', 422, { fields: errors });
  const account = await updateAccount(userId, { profile, organisation });
  const res = Response.json(account);
  if (profile.locale) res.headers.append('set-cookie', localeCookie(profile.locale));
  return res;
}
