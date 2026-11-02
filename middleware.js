import { NextResponse } from 'next/server.js';
import { getSession } from './lib/auth/session.js';
import { isSupabase } from './lib/db/source.js';

// SC-35 and its API are for VFDA staff (admin inherits, D5). The database enforces the same rule with RLS;
// this gate answers early so a member never gets the screen (FR-004).
const STAFF_ROLES = ['vfda_staff', 'admin'];

/**
 * SC-07: the reset link from the email opens /reset-password?code=… (Supabase Auth, PKCE). The code is exchanged
 * here, where cookies can still be written, then the page opens without it. A used or expired code shows the
 * expired-link panel (SR-221).
 */
async function openResetLink(request, url) {
  const clean = new URL('/reset-password', url.origin);
  const response = NextResponse.redirect(clean);
  const { getUserClient } = await import('./lib/supabase/server.js');
  const db = await getUserClient({ request, response });
  const { error } = await db.auth.exchangeCodeForSession(url.searchParams.get('code'));
  if (!error) return response;
  clean.searchParams.set('error', 'link_expired');
  return NextResponse.redirect(clean);
}

export async function middleware(request) {
  const response = NextResponse.next();
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/reset-password' && url.searchParams.has('code') && isSupabase()) {
    return openResetLink(request, url);
  }
  const adminApi = pathname.startsWith('/api/admin/');
  const adminPage = pathname === '/admin' || pathname.startsWith('/admin/');

  // With Supabase, reading the session also refreshes its cookies (@supabase/ssr), on every request
  if (!adminApi && !adminPage) {
    if (isSupabase()) await getSession({ request, response });
    return response;
  }

  const session = await getSession({ request, response });
  if (!session.isAuthenticated) {
    if (adminApi) {
      return NextResponse.json({ error: 'UNAUTHENTICATED', message: 'Sign in as VFDA staff to manage locations.' }, { status: 401 });
    }
    // Back to the same page after sign-in, query string included (SC-04 SR-025)
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`${pathname}${url.search}`)}`, request.url));
  }
  if (!STAFF_ROLES.includes(session.role)) {
    return adminApi
      ? NextResponse.json({ error: 'FORBIDDEN', message: 'Only VFDA staff can manage locations.' }, { status: 403 })
      : new NextResponse('This screen is for VFDA staff only.', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
