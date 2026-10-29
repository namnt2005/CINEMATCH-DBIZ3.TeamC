// Signed-in roles of ck_user_account_role (data/schema/schema-SYS.sql); anything else is a guest.
const SIGNED_IN_ROLES = ['member', 'partner', 'vfda_staff', 'vfda_legal', 'admin'];

/**
 * Resolves session role and authentication status from request headers or mock configuration.
 * Adheres to Complexity Tracking in plan.md (login simulated via mock role toggle).
 *
 * @param {Record<string, string>|Headers|null} headers
 * @returns {{ role: 'guest'|'member'|'partner'|'vfda_staff'|'vfda_legal'|'admin', isAuthenticated: boolean }}
 */
export function resolveSessionRole(headers) {
  if (!headers) {
    return { role: 'guest', isAuthenticated: false };
  }

  let roleHeader = null;
  if (typeof headers.get === 'function') {
    roleHeader = headers.get('x-mock-role');
  } else if (typeof headers === 'object') {
    roleHeader = headers['x-mock-role'] || headers['X-Mock-Role'];
  }

  const role = (roleHeader || 'guest').toLowerCase().trim();

  if (SIGNED_IN_ROLES.includes(role)) {
    return { role, isAuthenticated: true };
  }
  return { role: 'guest', isAuthenticated: false };
}
