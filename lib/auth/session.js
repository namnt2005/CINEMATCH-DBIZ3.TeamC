/**
 * Resolves session role and authentication status from request headers or mock configuration.
 * Adheres to Complexity Tracking in plan.md (login simulated via mock role toggle).
 * 
 * @param {Record<string, string>|Headers|null} headers
 * @returns {{ role: 'guest'|'member'|'vfda_staff', isAuthenticated: boolean }}
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

  switch (role) {
    case 'member':
      return { role: 'member', isAuthenticated: true };
    case 'vfda_staff':
      return { role: 'vfda_staff', isAuthenticated: true };
    case 'guest':
    default:
      return { role: 'guest', isAuthenticated: false };
  }
}
