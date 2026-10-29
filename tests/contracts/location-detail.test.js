import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Imported inside each test so every scenario reports its own failure until T035 exists.
const loadRoute = () => import('../../app/api/locations/[slug]/route.js');

async function getDetail(slug, role) {
  const { GET } = await loadRoute();
  const headers = role ? { 'x-mock-role': role } : {};
  const req = new Request(`http://localhost:3000/api/locations/${slug}`, { method: 'GET', headers });
  return GET(req, { params: { slug } });
}

function assertBilingualNotFound(data) {
  assert.equal(data.error, 'NOT_FOUND');
  assert.equal(typeof data.message?.en, 'string');
  assert.equal(typeof data.message?.vi, 'string');
  assert.ok(data.message.en.length > 0 && data.message.vi.length > 0, 'Both messages must be non-empty');
  assert.notEqual(data.message.en, data.message.vi, 'English and Vietnamese messages must differ');
}

describe('GET /api/locations/:slug (T028, US-2 Scenario 2.1, F-M3-13)', () => {
  test('F-M3-13: trang-an returns names, scene types, logistics and permit complexity', async () => {
    const res = await getDetail('trang-an');
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.slug, 'trang-an');
    assert.equal(data.name_vi, 'Quần thể danh thắng Tràng An');
    assert.equal(data.name_en, 'Tràng An Landscape Complex');
    assert.deepEqual(data.scene_types, ['karst', 'river', 'village']);
    assert.deepEqual(data.logistics, {
      crew_capacity: '15_50',
      lodging_20km: true,
      grid_power: true,
      truck_access: true
    });
    assert.equal(data.airport_km, 95);
    assert.equal(data.permit_complexity, 'high');
    assert.equal(data.has_verified_contact, true);
  });

  test('F-M3-13 / Clarifications Q3: season block carries months_to_avoid, rainy_months and night_shooting_allowed', async () => {
    const res = await getDetail('trang-an');
    const data = await res.json();

    assert.deepEqual(data.season.months_to_avoid, [9, 10]);
    assert.deepEqual(data.season.rainy_months, [6, 7, 8]);
    assert.equal(data.season.night_shooting_allowed, 'no');
  });

  test('Clarifications Q3: tam-coc keeps an empty rainy_months list and night_shooting_allowed = ask', async () => {
    const res = await getDetail('tam-coc');
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.deepEqual(data.season.rainy_months, []);
    assert.equal(data.season.night_shooting_allowed, 'ask');
  });

  test('F-M3-13: only approved photos are returned', async () => {
    const trangAn = await (await getDetail('trang-an')).json();
    assert.deepEqual(
      trangAn.images.map(i => i.image_url),
      [
        'https://storage.cinematch.example/locations/trang-an/01.jpg',
        'https://storage.cinematch.example/locations/trang-an/02.jpg'
      ]
    );
    for (const image of trangAn.images) {
      assert.ok(image.image_source, 'Every photo carries its source (FR-003)');
      assert.ok(image.usage_right, 'Every photo carries its usage right (FR-003)');
    }

    // cai-rang has one approved and one pending photo in the seed.
    const caiRang = await (await getDetail('cai-rang')).json();
    assert.deepEqual(
      caiRang.images.map(i => i.image_url),
      ['https://storage.cinematch.example/locations/cai-rang/01.jpg']
    );
  });

  test('BR-005 / SC-004: the guest payload holds no authority contact data', async () => {
    const res = await getDetail('trang-an');
    const raw = await res.text();

    for (const leak of ['contact_phone', 'contact_email', 'contact_name', '+84 000 000', 'Bùi Văn Thành', 'lienhe@trangan.example.vn']) {
      assert.ok(!raw.includes(leak), `Response body must not contain "${leak}"`);
    }
  });

  test('BR-004 / BR-008: unpublished cua-van and awaiting-contact mui-ne return 404 for a guest', async () => {
    for (const slug of ['cua-van', 'mui-ne']) {
      const res = await getDetail(slug);
      assert.equal(res.status, 404, `${slug} must not be served`);
      const data = await res.json();
      assertBilingualNotFound(data);
      assert.equal(data.name_en, undefined, `${slug} details must not leak in the 404 body`);
    }
  });

  test('F-M3-13: an unknown slug returns 404 with an English and Vietnamese message', async () => {
    const res = await getDetail('khong-ton-tai');
    assert.equal(res.status, 404);
    assertBilingualNotFound(await res.json());
  });
});
