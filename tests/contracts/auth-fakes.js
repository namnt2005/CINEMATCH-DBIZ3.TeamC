// Fake Supabase client for the auth contract tests (not a test file). It mimics the parts of
// supabase-js the auth routes use, records every call, and never touches the network (decision D1).

export const ACTIVE = { id: '11111111-1111-4111-8111-111111111111', email: 'lena.park@harbourline.example', password: 'correct-horse-42', role: 'member', account_status: 'active' };
export const DEACTIVATED = { id: '22222222-2222-4222-8222-222222222222', email: 'gone@harbourline.example', password: 'old-password-42', role: 'member', account_status: 'deactivated' };
export const STAFF = { id: '515529a9-46d9-559c-aab4-e5fb31eedeea', email: 'thuha.nguyen@vfda-demo.example.vn', password: 'staff-password-42', role: 'vfda_staff', account_status: 'active' };

const authError = (code, message, status = 400) => ({ name: 'AuthApiError', code, message, status });

/**
 * @param {object} [options]
 * @param {object[]} [options.users] accounts known to Auth and user_account
 * @param {object|null} [options.currentUser] the user of the session in the cookies (e.g. a recovery session)
 * @param {Record<string, object>} [options.codes] valid callback codes / token hashes → user
 * @param {boolean} [options.resendFails] the email provider is down
 */
export function fakeAuthSupabase({ users = [ACTIVE, DEACTIVATED, STAFF], currentUser = null, codes = {}, resendFails = false } = {}) {
  const calls = [];
  let current = currentUser;
  const byEmail = (email) => users.find(u => u.email === String(email || '').toLowerCase());
  const publicUser = (u) => (u ? { id: u.id, email: u.email, identities: [{ provider: 'email' }] } : null);

  const auth = {
    async signInWithPassword(args) {
      calls.push({ auth: 'signInWithPassword', args });
      const u = byEmail(args.email);
      // Distinct errors on purpose: the route must not pass Supabase's wording to the user
      if (!u) return { data: { user: null, session: null }, error: authError('user_not_found', 'User not found') };
      if (u.password !== args.password) return { data: { user: null, session: null }, error: authError('invalid_credentials', 'Invalid login credentials') };
      current = u;
      return { data: { user: publicUser(u), session: { access_token: 'fake-access', refresh_token: 'fake-refresh' } }, error: null };
    },
    async signUp(args) {
      calls.push({ auth: 'signUp', args });
      const u = byEmail(args.email);
      // Supabase answers a repeated sign-up with a user that has no identities, and sends no email
      if (u) return { data: { user: { id: u.id, email: u.email, identities: [] }, session: null }, error: null };
      return { data: { user: { id: '33333333-3333-4333-8333-333333333333', email: args.email, identities: [{ provider: 'email' }] }, session: null }, error: null };
    },
    async signOut(args) {
      calls.push({ auth: 'signOut', args });
      if (!args || args.scope !== 'others') current = null;
      return { error: null };
    },
    async getUser() {
      calls.push({ auth: 'getUser' });
      return current ? { data: { user: publicUser(current) }, error: null } : { data: { user: null }, error: authError('session_missing', 'Auth session missing!') };
    },
    async resetPasswordForEmail(email, options) {
      calls.push({ auth: 'resetPasswordForEmail', email, options });
      return { data: {}, error: null };
    },
    async updateUser(args) {
      calls.push({ auth: 'updateUser', args });
      if (!current) return { data: { user: null }, error: authError('session_missing', 'Auth session missing!') };
      return { data: { user: publicUser(current) }, error: null };
    },
    async resend(args) {
      calls.push({ auth: 'resend', args });
      return resendFails ? { data: null, error: authError('over_email_send_rate_limit', 'Email provider down', 500) } : { data: {}, error: null };
    },
    async exchangeCodeForSession(code) {
      calls.push({ auth: 'exchangeCodeForSession', code });
      if (!codes[code]) return { data: { session: null }, error: authError('otp_expired', 'Email link is invalid or has expired', 403) };
      current = codes[code];
      return { data: { session: {}, user: publicUser(current) }, error: null };
    },
    async verifyOtp(args) {
      calls.push({ auth: 'verifyOtp', args });
      if (!codes[args.token_hash]) return { data: { session: null }, error: authError('otp_expired', 'Email link is invalid or has expired', 403) };
      current = codes[args.token_hash];
      return { data: { session: {}, user: publicUser(current) }, error: null };
    }
  };

  // user_account rows, looked up by user_id or email
  function from(table) {
    const filters = [];
    const matches = () => (table === 'user_account' ? users : [])
      .filter(u => filters.every(([col, val]) => (col === 'user_id' ? u.id : u[col]) === val))
      .map(u => ({ user_id: u.id, email: u.email, role: u.role, account_status: u.account_status }));
    const chain = {
      select() { calls.push({ from: table }); return chain; },
      eq(col, val) { filters.push([col, col === 'email' ? String(val).toLowerCase() : val]); return chain; },
      ilike(col, val) { filters.push([col, String(val).toLowerCase()]); return chain; },
      limit() { return chain; },
      maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
      single: async () => ({ data: matches()[0] ?? null, error: null }),
      then: (ok, ko) => Promise.resolve({ data: matches(), error: null }).then(ok, ko)
    };
    return chain;
  }

  return { calls, auth, from, get currentUser() { return current; } };
}

export const authCalls = (client, name) => client.calls.filter(c => c.auth === name);

export function jsonRequest(path, body, { origin = 'http://localhost:3000', headers = {} } = {}) {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

/** Turns on the Supabase source with this fake as both the user and the admin (System) client. */
export async function useFakeSupabase(client) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  const { setSupabaseClientsForTests } = await import('../../lib/supabase/testing.js');
  setSupabaseClientsForTests({ user: client, admin: client });
}

export async function resetFakeSupabase() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  const { resetSupabaseClientsForTests } = await import('../../lib/supabase/testing.js');
  resetSupabaseClientsForTests();
}

// next values that must never leave the site (SC-04 SR-025)
export const UNSAFE_NEXT = ['https://evil.example/', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'evil.example', '/\\\\evil.example', ' //evil.example'];
