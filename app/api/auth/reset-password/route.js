import { checkPassword } from '../../../../lib/auth/signup-input.js';
import { authError, authUnavailable, readJson, userClient, accountStatus } from '../../../../lib/api/auth.js';

/**
 * POST /api/auth/reset-password — SC-07 (FR-003).
 * Needs the recovery session that the link from the email opened (the middleware exchanged its code).
 * Supabase Auth stores the new password (SR-221, BR-004); every other session is then signed out (SR-224).
 */
export async function POST(req) {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;

  const body = (await readJson(req)) ?? {};
  const passwordError = checkPassword(body.new_password);
  if (passwordError) return authError('VALIDATION_ERROR', 422, { fields: { new_password: passwordError } });

  const db = await userClient();
  const { data } = await db.auth.getUser();
  if (!data?.user) return authError('LINK_EXPIRED', 410);

  const account = await accountStatus(db, 'user_id', data.user.id);
  if (account?.account_status === 'deactivated') return authError('ACCOUNT_DEACTIVATED', 403);

  const { error } = await db.auth.updateUser({ password: body.new_password });
  if (error) {
    if (error.code === 'session_missing' || error.status === 401) return authError('LINK_EXPIRED', 410);
    if (error.code === 'same_password' || error.code === 'weak_password') {
      return authError('VALIDATION_ERROR', 422, { fields: { new_password: 'auth.error.password_short' } });
    }
    console.error('Password update failed:', error.code || error.status);
    return authError('UNAVAILABLE', 503);
  }
  await db.auth.signOut({ scope: 'others' });
  return Response.json({ status: 'ok' }, { status: 200 });
}
