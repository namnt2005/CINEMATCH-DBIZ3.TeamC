import { safeNext } from '../../../../lib/auth/next.js';
import { authError, authUnavailable, readJson, userClient, accountStatus } from '../../../../lib/api/auth.js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sign-in — SC-05 Log in (FR-002).
 * One answer for an unknown email and a wrong password, never Supabase's wording (SC-04 Error state).
 * A deactivated account is refused only after the right password, so its status cannot be probed (BR-005).
 */
export async function POST(req) {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;

  const body = (await readJson(req)) ?? {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return authError('INVALID_CREDENTIALS', 401);

  const db = await userClient();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    // Supabase says this only when the password was right, so it reveals nothing to a stranger (interim choice)
    if (error?.code === 'email_not_confirmed') return authError('EMAIL_NOT_VERIFIED', 403);
    return authError('INVALID_CREDENTIALS', 401);
  }

  const account = await accountStatus(db, 'user_id', data.user.id);
  if (account?.account_status === 'deactivated') {
    await db.auth.signOut();
    return authError('ACCOUNT_DEACTIVATED', 403);
  }

  return Response.json({ redirect: safeNext(body.next) }, { status: 200 });
}
