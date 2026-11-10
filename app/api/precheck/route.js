import { getSession } from '../../../lib/auth/session.js';
import { runPrecheck } from '../../../lib/db/precheck.js';
import { validatePrecheckInput } from '../../../lib/content-check/input.js';
import { takeCheck, GUEST_LIMIT, MEMBER_LIMIT } from '../../../lib/content-check/rate-limit.js';
import { checkError, fromCheckError, clientIp, countryOf } from '../../../lib/api/checks.js';
import { readBody } from '../../../lib/api/projects.js';

/**
 * POST /api/precheck — SC-03 → SC-48 (M2 FR-005..FR-007, FR-011, FR-012, BR-001, BR-004; D7, D11, D12).
 * No sign-up needed. The summary is checked and thrown away: only its hash, the cited revisions and spans are stored.
 */
export async function POST(req) {
  const body = await readBody(req);
  const checked = validatePrecheckInput(body);
  if (!checked.ok) return checkError('VALIDATION_ERROR', { fields: checked.errors });
  const session = await getSession({ headers: req.headers });
  const signedIn = Boolean(session?.isAuthenticated && session.userId);
  const allowed = takeCheck(signedIn ? `user:${session.userId}` : `ip:${clientIp(req)}`, signedIn ? MEMBER_LIMIT : GUEST_LIMIT);
  if (!allowed.ok) return checkError('RATE_LIMITED', { signed_in: signedIn });
  try {
    return Response.json(await runPrecheck(session, checked.value, { country: countryOf(req) }));
  } catch (err) {
    return fromCheckError(err);
  }
}
