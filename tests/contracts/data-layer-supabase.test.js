import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const loadTesting = () => import('../../lib/supabase/testing.js');

const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e';
const member = { role: 'member', isAuthenticated: true, userId: '11111111-1111-4111-8111-111111111111' };
const staff = { role: 'vfda_staff', isAuthenticated: true, userId: '515529a9-46d9-559c-aab4-e5fb31eedeea' };
const guest = { role: 'guest', isAuthenticated: false, userId: null };

// Records every call; answers from(table) with rows and rpc(name) with { data, error }
function fakeSupabase({ rows = {}, rpc = {} } = {}) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      const filters = [];
      const result = () => ({ data: rows[table] ?? [], error: null });
      const chain = {
        select(cols) { calls.push({ from: table, select: cols }); return chain; },
        eq(col, val) { filters.push([col, val]); calls.push({ from: table, eq: [col, val] }); return chain; },
        order() { return chain; },
        limit() { return chain; },
        maybeSingle: async () => ({ data: (rows[table] ?? [])[0] ?? null, error: null }),
        single: async () => ({ data: (rows[table] ?? [])[0] ?? null, error: null }),
        then: (ok, ko) => Promise.resolve(result()).then(ok, ko)
      };
      return chain;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      return rpc[name] ?? { data: null, error: null };
    }
  };
  return client;
}

describe('lib/db on the Supabase source with a fake client (T019, D4, research R4, R9, US-2 Scenarios 1–2)', () => {
  beforeEach(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'; });
  afterEach(async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    (await loadTesting()).resetSupabaseClientsForTests();
  });

  test('BR-001 / US-2 Scenario 1: a guest gets no contact and no query is sent', async () => {
    const user = fakeSupabase();
    (await loadTesting()).setSupabaseClientsForTests({ user });
    const { getAuthorityContact } = await import('../../lib/db/contacts.js');
    assert.equal(await getAuthorityContact(TRANG_AN, guest), null);
    assert.equal(user.calls.length, 0);
  });

  test('US-2 Scenario 2: a member gets the verified contact of a published location through RLS', async () => {
    const user = fakeSupabase({ rows: { authority_contact: [{
      location_id: TRANG_AN, authority_name: 'Ban Quản lý', contact_name: 'Bùi Văn Thành', contact_phone: '+84 000 000 101',
      contact_email: 'lienhe@trangan.example.vn', verified_by: staff.userId, verified_at: '2026-05-20T10:00:00+07:00', contact_verified: true
    }] } });
    (await loadTesting()).setSupabaseClientsForTests({ user });
    const { getAuthorityContact } = await import('../../lib/db/contacts.js');

    const contact = await getAuthorityContact(TRANG_AN, member);
    assert.equal(contact.contact_name, 'Bùi Văn Thành');
    assert.equal(contact.contact_verified, true);
    assert.ok(user.calls.some(c => c.from === 'authority_contact'));
    assert.ok(user.calls.some(c => c.eq?.[0] === 'location_id' && c.eq[1] === TRANG_AN));
  });

  test('BR-008: public location reads ask the database for published rows only', async () => {
    const user = fakeSupabase({ rows: { location: [] } });
    (await loadTesting()).setSupabaseClientsForTests({ user });
    const { getPublishedLocationBySlug } = await import('../../lib/db/locations.js');
    await getPublishedLocationBySlug('trang-an');
    assert.ok(user.calls.some(c => c.eq?.[0] === 'intake_status' && c.eq[1] === 'published'));
  });

  test('R4: publishing goes through the app_admin_publish_location RPC with the user client', async () => {
    const user = fakeSupabase({ rows: { location: [{ location_id: TRANG_AN, intake_status: 'awaiting_contact' }] } });
    (await loadTesting()).setSupabaseClientsForTests({ user });
    const { publishLocation } = await import('../../lib/db/admin-locations.js');
    await publishLocation(TRANG_AN, staff);
    assert.ok(user.calls.some(c => c.rpc === 'app_admin_publish_location' && c.args?.p_location_id === TRANG_AN));
  });

  test('M3 BR-004: the database refusal maps to UNVERIFIED_CONTACT, as on the sqlite source', async () => {
    const user = fakeSupabase({
      rows: { location: [{ location_id: TRANG_AN, intake_status: 'awaiting_contact' }] },
      rpc: { app_admin_publish_location: { data: null, error: { code: 'P0001', message: 'Authority contact not verified (M3 BR-004).' } } }
    });
    (await loadTesting()).setSupabaseClientsForTests({ user });
    const { publishLocation } = await import('../../lib/db/admin-locations.js');
    await assert.rejects(() => publishLocation(TRANG_AN, staff), err => err.code === 'UNVERIFIED_CONTACT' && err.status === 409);
  });

  test('R4: a refused role (SQLSTATE 42501) maps to FORBIDDEN', async () => {
    const user = fakeSupabase({
      rows: { location: [{ location_id: TRANG_AN, intake_status: 'published' }] },
      rpc: { app_admin_unpublish_location: { data: null, error: { code: '42501', message: 'forbidden' } } }
    });
    (await loadTesting()).setSupabaseClientsForTests({ user });
    const { unpublishLocation } = await import('../../lib/db/admin-locations.js');
    await assert.rejects(() => unpublishLocation(TRANG_AN, null, member), err => err.code === 'FORBIDDEN' && err.status === 403);
  });
});
