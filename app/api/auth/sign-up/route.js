import { validateSignUpInput } from '../../../../lib/auth/signup-input.js';
import { safeNext } from '../../../../lib/auth/next.js';
import { currentConsentVersion } from '../../../../lib/db/consent.js';
import { authError, authUnavailable, readJson, siteOrigin, userClient } from '../../../../lib/api/auth.js';

/**
 * POST /api/auth/sign-up — SC-04 Create account (FR-001, US-1 Scenarios 1 and 3).
 * The password goes to Supabase Auth only (BR-004). The metadata carries the FR-001 fields and the server's
 * consent version (BR-003); the database trigger creates the account with the role member (BR-002).
 */
export async function POST(req) {
  const unavailable = authUnavailable();
  if (unavailable) return unavailable;

  const body = await readJson(req);
  if (!body) return authError('INVALID_JSON', 400);

  const { ok, errors, value } = validateSignUpInput(body);
  if (!ok) return authError('VALIDATION_ERROR', 422, { fields: errors });

  const redirect = new URL('/auth/callback', siteOrigin(req));
  redirect.searchParams.set('next', safeNext(body.next));

  const db = await userClient();
  const { data, error } = await db.auth.signUp({
    email: value.email,
    password: value.password,
    options: {
      emailRedirectTo: redirect.toString(),
      data: {
        full_name: value.full_name,
        crew_role: value.crew_role,
        org_name: value.org_name,
        country: value.country,
        website: value.website,
        locale: value.locale,
        consent_version: currentConsentVersion()
      }
    }
  });

  if (error) {
    if (error.code === 'user_already_exists' || error.code === 'email_exists') return authError('EMAIL_TAKEN', 409);
    console.error('Sign-up failed:', error.code || error.status);
    return authError('UNAVAILABLE', 503);
  }
  // A repeated sign-up comes back as a user without identities and sends no email (research R5)
  if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) return authError('EMAIL_TAKEN', 409);

  return Response.json({ status: 'verification_sent' }, { status: 201 });
}
