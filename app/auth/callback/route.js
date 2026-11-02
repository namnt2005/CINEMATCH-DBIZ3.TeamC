import { NextResponse } from 'next/server.js';
import { safeNext } from '../../../lib/auth/next.js';
import { isSupabase } from '../../../lib/db/source.js';

/**
 * GET /auth/callback — the verification link of the sign-up email (US-1 Scenario 2).
 * Supabase Auth checks the code or token and starts the session; the user returns to the page that led to
 * sign-up (internal paths only, SR-025). An expired or used link goes to /login?error=link_expired.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  const expired = () => NextResponse.redirect(new URL('/login?error=link_expired', url.origin));
  if (!isSupabase()) return expired();

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  const { getUserClient } = await import('../../../lib/supabase/server.js');
  const db = await getUserClient();
  let result;
  if (code) result = await db.auth.exchangeCodeForSession(code);
  else if (tokenHash && type) result = await db.auth.verifyOtp({ token_hash: tokenHash, type });
  else return expired();

  if (result?.error) return expired();
  return NextResponse.redirect(new URL(next, url.origin));
}
