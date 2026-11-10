import { checkEmail } from '../../../../lib/auth/signup-input.js';
import { authUnavailable, readJson, siteOrigin, userClient, systemClient, accountStatus } from '../../../../lib/api/auth.js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/forgot-password — SC-06 (FR-003).
 * The same answer whether or not the account exists (SR-211); a deactivated account gets no email (SR-213).
 * Supabase Auth makes and checks the single-use link (SR-212); the link opens /reset-password (SC-07).
 */
export async function POST(req) {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;

  const body = (await readJson(req)) ?? {};
  const { email, error } = checkEmail(body.email);
  if (!error) {
    // The account status is not visible to a guest through RLS: the System client reads it (D2)
    const account = await accountStatus(await systemClient(), 'email', email);
    if (account?.account_status !== 'deactivated') {
      const db = await userClient();
      const result = await db.auth.resetPasswordForEmail(email, { redirectTo: new URL('/reset-password', siteOrigin(req)).toString() });
      if (result?.error) console.error('Reset email failed:', result.error.code || result.error.status);
    }
  }
  return Response.json({ status: 'sent' }, { status: 200 });
}
