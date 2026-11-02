// Test seam: lets offline tests replace the Supabase clients with fakes (specs/003-sys-core T008).
const overrides = { user: null, admin: null };

export function setSupabaseClientsForTests({ user = null, admin = null } = {}) {
  overrides.user = user;
  overrides.admin = admin;
}

export function resetSupabaseClientsForTests() {
  overrides.user = null;
  overrides.admin = null;
}

export function testClient(kind) {
  return overrides[kind];
}
