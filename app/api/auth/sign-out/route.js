import { authUnavailable, userClient } from '../../../../lib/api/auth.js';

export const dynamic = 'force-dynamic';

/** POST /api/auth/sign-out — ends the session of this browser (FR-002). */
export async function POST() {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;
  const db = await userClient();
  await db.auth.signOut();
  return Response.json({ status: 'signed_out' }, { status: 200 });
}
