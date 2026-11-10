import { checkEmail } from '../../../../lib/auth/signup-input.js';
import { authUnavailable, readJson, siteOrigin, userClient } from '../../../../lib/api/auth.js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/resend-verification — SC-04 *Resend* (edge case: email provider down).
 * Always 200 with the same body, so it cannot tell who has an account; the screen locks Resend for 60 s.
 */
export async function POST(req) {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;

  const body = (await readJson(req)) ?? {};
  const { email, error } = checkEmail(body.email);
  if (!error) {
    const db = await userClient();
    const redirect = new URL('/auth/callback', siteOrigin(req));
    redirect.searchParams.set('next', '/locations');
    const result = await db.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirect.toString() } });
    if (result?.error) console.error('Resend failed:', result.error.code || result.error.status);
  }
  return Response.json({ status: 'sent' }, { status: 200 });
}
