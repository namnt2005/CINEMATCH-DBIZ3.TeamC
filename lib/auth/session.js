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
 * Resolves the mock session of the node:sqlite source.
 * The x-mock-role header counts only when NODE_ENV=test (`npm test`); `next dev`, `next start` and production
 * ignore it (specs/003-sys-core research R6, T073). Without a usable header, MOCK_AUTH_DEFAULT_ROLE is used,
 * never in production (research R4 of 002, interim until its Open question 2 is answered).
 *
 * @param {Record<string, string>|Headers|null} headers
 * @param {Record<string, string|undefined>} [env] server environment, process.env by default
 * @returns {{ role: 'guest'|'member'|'partner'|'vfda_staff'|'vfda_legal'|'admin', isAuthenticated: boolean, userId: string|null }}
 */
export function resolveSessionRole(headers, env = process.env) {
  const header = env.NODE_ENV === 'test' ? readRoleHeader(headers) : null;
  const fallback = env.NODE_ENV === 'production' ? null : env.MOCK_AUTH_DEFAULT_ROLE;
  const role = String(header || fallback || 'guest').toLowerCase().trim();

  if (!SIGNED_IN_ROLES.includes(role)) {
    return { role: 'guest', isAuthenticated: false, userId: null };
  }
  const userId = role === 'vfda_staff' ? (env.MOCK_STAFF_USER_ID || DEFAULT_STAFF_USER_ID) : null;
  return { role, isAuthenticated: true, userId };
}

const GUEST = { role: 'guest', isAuthenticated: false, userId: null, status: null };

/**
 * The current session, from the active data source (specs/003-sys-core research R6).
 * - node:sqlite (offline): the mock above (x-mock-role under NODE_ENV=test only, MOCK_AUTH_DEFAULT_ROLE, MOCK_STAFF_USER_ID).
 * - Supabase: the signed-in user validated by Supabase Auth, with the role and status of their
 *   user_account row (FR-004). x-mock-role is ignored. A deactivated account is a guest (BR-005).
 *
 * @param {{ headers?: Headers|object, request?: Request, response?: Response }} [context]
 *        request/response: from middleware, so refreshed session cookies reach the response
 */
export async function getSession({ headers, request, response } = {}) {
  const { isSupabase } = await import('../db/source.js');
  if (!isSupabase()) return resolveSessionRole(headers ?? request?.headers ?? null);

  const { getUserClient } = await import('../supabase/server.js');
  const db = await getUserClient({ request, response });
  const { data } = await db.auth.getUser();
  const user = data?.user;
  if (!user) return GUEST;

  const { data: row } = await db.from('user_account').select('role, account_status').eq('user_id', user.id).maybeSingle();
  if (!row || row.account_status === 'deactivated' || !SIGNED_IN_ROLES.includes(row.role)) {
    return { ...GUEST, status: row?.account_status ?? null };
  }
  return { role: row.role, isAuthenticated: true, userId: user.id, status: row.account_status || 'active' };
}
