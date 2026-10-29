import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Imported inside each test so every scenario reports its own failure until T036 exists.
const loadRoute = () => import('../../app/api/locations/[slug]/authority-contact/route.js');

async function getContact(slug, role) {
  const { GET } = await loadRoute();
  const headers = role ? { 'x-mock-role': role } : {};
  const req = new Request(`http://localhost:3000/api/locations/${slug}/authority-contact`, { method: 'GET', headers });
  return GET(req, { params: { slug } });
}

describe('GET /api/locations/:slug/authority-contact (T029, US-2, F-M3-15, BR-005)', () => {
  test('BR-005: a guest without x-mock-role gets 401 with a sign-up link', async () => {
    const res = await getContact('trang-an');
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error, 'UNAUTHENTICATED');
    assert.equal(data.signup_url, '/auth/signup');
  });

  test('BR-005: the guest response contains no contact name, phone or email', async () => {
    const res = await getContact('trang-an');
    const raw = await res.text();

    for (const leak of ['Bùi Văn Thành', '+84 000 000 101', 'lienhe@trangan.example.vn', 'contact_name', 'contact_phone', 'contact_email']) {
      assert.ok(!raw.includes(leak), `Guest response must not contain "${leak}"`);
    }
  });

  test('F-M3-15 / US-2 Scenario 2.2: a member gets the verified contact with its verification date', async () => {
    const res = await getContact('trang-an', 'member');
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.location_id, '607132bd-b05b-52c6-900f-5f2928c17a9e');
    assert.ok(data.authority_name, 'Authority office is shown');
    assert.equal(data.contact_name, 'Bùi Văn Thành');
    assert.equal(data.contact_phone, '+84 000 000 101');
    assert.equal(data.contact_email, 'lienhe@trangan.example.vn');
    assert.equal(data.contact_verified, true);
    assert.match(String(data.verified_at), /^2026-05-20/);
  });

  test('F-M3-15: VFDA staff also get the verified contact', async () => {
    const res = await getContact('trang-an', 'vfda_staff');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).contact_name, 'Bùi Văn Thành');
  });

  test('F-M3-15: an unknown slug returns 404 with an English and Vietnamese message', async () => {
    const res = await getContact('khong-ton-tai', 'member');
    assert.equal(res.status, 404);

    const data = await res.json();
    assert.equal(data.error, 'NOT_FOUND');
    assert.ok(data.message?.en && data.message?.vi, 'Both languages are present');
  });
});
