// Signed-in roles of ck_user_account_role (data/schema/schema-SYS.sql); anything else is a guest.
const SIGNED_IN_ROLES = ['member', 'partner', 'vfda_staff', 'vfda_legal', 'admin'];

// Seed staff account that acts for the mock vfda_staff role (specs/002-m3-publish/research.md R3).
// Interim until research Open question 1 is answered; MOCK_STAFF_USER_ID overrides it.
const DEFAULT_STAFF_USER_ID = '515529a9-46d9-559c-aab4-e5fb31eedeea';

function readRoleHeader(headers) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get('x-mock-role');
  if (typeof headers === 'object') return headers['x-mock-role'] || headers['X-Mock-Role'] || null;
  return null;
}

/**
 * Resolves session role and authentication status from request headers or mock configuration.
 * Adheres to Complexity Tracking in plan.md (login simulated via mock role toggle until the SYS slice).
 * Without an x-mock-role header, MOCK_AUTH_DEFAULT_ROLE is used, never in production
 * (research R4, interim until research Open question 2 is answered); the header always wins.
 *
 * @param {Record<string, string>|Headers|null} headers
 * @param {Record<string, string|undefined>} [env] server environment, process.env by default
 * @returns {{ role: 'guest'|'member'|'partner'|'vfda_staff'|'vfda_legal'|'admin', isAuthenticated: boolean, userId: string|null }}
 */
export function resolveSessionRole(headers, env = process.env) {
  const fallback = env.NODE_ENV === 'production' ? null : env.MOCK_AUTH_DEFAULT_ROLE;
  const role = String(readRoleHeader(headers) || fallback || 'guest').toLowerCase().trim();

  if (!SIGNED_IN_ROLES.includes(role)) {
    return { role: 'guest', isAuthenticated: false, userId: null };
  }
  const userId = role === 'vfda_staff' ? (env.MOCK_STAFF_USER_ID || DEFAULT_STAFF_USER_ID) : null;
  return { role, isAuthenticated: true, userId };
}
