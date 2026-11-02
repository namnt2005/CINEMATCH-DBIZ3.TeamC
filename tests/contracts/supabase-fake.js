// In-memory stand-in for supabase-js (not a test file): tables as arrays, the query builder methods the
// app uses, rpc handlers, auth and auth.admin. Every call is recorded so a test can check what was asked.
// Row Level Security is not simulated: tests check that the code itself filters to the user's rows.

const clone = (v) => JSON.parse(JSON.stringify(v));

// store: share the tables of another fake (the user client and the System client see one database)
export function fakeSupabase({ tables = {}, user = null, rpc = {}, store = null } = {}) {
  const data = store ?? clone(tables);
  const calls = [];
  let currentUser = user;

  function from(table) {
    const state = { table, filters: [], order: null, limit: null, range: null, op: 'select', values: null, count: null, head: false };
    const rowsOf = () => (data[table] ||= []);
    const matches = (row) => state.filters.every(([kind, col, val]) => {
      if (kind === 'eq') return row[col] === val;
      if (kind === 'neq') return row[col] !== val;
      if (kind === 'in') return val.includes(row[col]);
      if (kind === 'is') return val === null ? row[col] === null || row[col] === undefined : row[col] === val;
      if (kind === 'lt') return row[col] < val;
      if (kind === 'gt') return row[col] > val;
      return true;
    });
    function run() {
      calls.push({ table, op: state.op, filters: state.filters, order: state.order, limit: state.limit, values: state.values });
      if (state.op === 'insert') {
        const list = Array.isArray(state.values) ? state.values : [state.values];
        rowsOf().push(...clone(list));
        return { data: clone(list), error: null };
      }
      if (state.op === 'update') {
        const hit = rowsOf().filter(matches);
        for (const row of hit) Object.assign(row, clone(state.values));
        return { data: clone(hit), error: null };
      }
      let out = rowsOf().filter(matches);
      if (state.order) {
        const { col, ascending } = state.order;
        out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (ascending ? 1 : -1));
      }
      const count = out.length;
      if (state.range) out = out.slice(state.range[0], state.range[1] + 1);
      if (state.limit !== null) out = out.slice(0, state.limit);
      return { data: state.head ? null : clone(out), count: state.count ? count : null, error: null };
    }
    const chain = {
      select(_cols, opts = {}) { if (state.op === 'select') { state.count = opts.count || null; state.head = Boolean(opts.head); } return chain; },
      insert(values) { state.op = 'insert'; state.values = values; return chain; },
      update(values) { state.op = 'update'; state.values = values; return chain; },
      eq(col, val) { state.filters.push(['eq', col, val]); return chain; },
      neq(col, val) { state.filters.push(['neq', col, val]); return chain; },
      in(col, val) { state.filters.push(['in', col, val]); return chain; },
      is(col, val) { state.filters.push(['is', col, val]); return chain; },
      lt(col, val) { state.filters.push(['lt', col, val]); return chain; },
      gt(col, val) { state.filters.push(['gt', col, val]); return chain; },
      order(col, { ascending = true } = {}) { state.order = { col, ascending }; return chain; },
      limit(n) { state.limit = n; return chain; },
      range(a, b) { state.range = [a, b]; return chain; },
      maybeSingle: async () => { const r = run(); return { data: r.data?.[0] ?? (Array.isArray(r.data) ? null : r.data), error: r.error }; },
      single: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
      then: (ok, ko) => Promise.resolve(run()).then(ok, ko)
    };
    return chain;
  }

  const client = {
    calls,
    tables: data,
    from,
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      const handler = rpc[name];
      return handler ? handler(args, { data, user: currentUser }) : { data: null, error: null };
    },
    auth: {
      async getUser() {
        calls.push({ auth: 'getUser' });
        return currentUser ? { data: { user: currentUser }, error: null } : { data: { user: null }, error: { code: 'session_missing', message: 'Auth session missing!' } };
      },
      async signOut(args) { calls.push({ auth: 'signOut', args }); currentUser = null; return { error: null }; },
      async resetPasswordForEmail(email, options) { calls.push({ auth: 'resetPasswordForEmail', email, options }); return { data: {}, error: null }; },
      admin: {
        async updateUserById(id, attrs) { calls.push({ authAdmin: 'updateUserById', id, attrs }); return { data: { user: { id, ...attrs } }, error: null }; }
      }
    },
    get currentUser() { return currentUser; }
  };
  return client;
}

/** Turns on the Supabase source with these fakes as the user client and the System (secret key) client. */
export async function useFakes({ user, admin = user }) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  const { setSupabaseClientsForTests } = await import('../../lib/supabase/testing.js');
  setSupabaseClientsForTests({ user, admin });
}

export async function resetFakes() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  const { resetSupabaseClientsForTests } = await import('../../lib/supabase/testing.js');
  resetSupabaseClientsForTests();
}
