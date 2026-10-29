import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { callAdmin, freshDatabase, MUI_NE, CUA_VAN } from './admin-helpers.js';

const TWENTY_FIELDS = [
  'name_vi', 'name_en', 'province_id', 'district', 'lat', 'lng', 'airport_km', 'scene_types', 'desc_vi', 'desc_en',
  'crew_capacity', 'lodging_20km', 'grid_power', 'truck_access', 'months_to_avoid', 'permit_complexity',
  'restriction_note', 'availability', 'night_shooting_allowed', 'rainy_months'
];

async function list(query = '') {
  const res = await callAdmin('list', 'GET', { query });
  assert.equal(res.status, 200);
  return res.json();
}

describe('GET /api/admin/locations and /:id (T010, FR-001, SC-35 #3–#10, contract §1–§2)', () => {
  beforeEach(freshDatabase);

  test('FR-001: staff see every location in every status, including unpublished Cửa Vạn', async () => {
    const data = await list();
    assert.equal(data.locations.length, 11);
    assert.deepEqual(data.counts, { all: 11, awaiting_contact: 1, published: 9, unpublished: 1 });

    const cuaVan = data.locations.find(l => l.location_id === CUA_VAN);
    assert.equal(cuaVan?.intake_status, 'unpublished');
  });

  test('FR-001: a row carries status, availability, contact verification, photo counts and blocked reason', async () => {
    const muiNe = (await list()).locations.find(l => l.location_id === MUI_NE);
    assert.equal(muiNe.slug, 'mui-ne');
    assert.equal(muiNe.name_en, 'Mũi Né Sand Dunes');
    assert.equal(muiNe.province, 'Lâm Đồng');
    assert.equal(muiNe.intake_status, 'awaiting_contact');
    assert.equal(muiNe.availability, 'open');
    assert.equal(muiNe.contact_verified, false);
    assert.equal(muiNe.verified_at, null);
    assert.equal(muiNe.photo_count, 1);
    assert.equal(muiNe.pending_photo_count, 0);
    assert.equal(muiNe.blocked_reason, 'Authority contact not verified (M3 BR-004).');
  });

  test('FR-001: status filter; counts still cover the whole catalogue', async () => {
    const data = await list('?status=published');
    assert.equal(data.locations.length, 9);
    assert.ok(data.locations.every(l => l.intake_status === 'published'));
    assert.equal(data.counts.all, 11);
  });

  test('FR-001 / SC-35 #6: name search with or without diacritics, and province filter', async () => {
    for (const q of ['mui ne', 'Mũi Né']) {
      const slugs = (await list(`?q=${encodeURIComponent(q)}`)).locations.map(l => l.slug);
      assert.deepEqual(slugs, ['mui-ne'], `q=${q}`);
    }
    const ninhBinh = (await list('?province_id=19')).locations.map(l => l.slug).sort();
    assert.deepEqual(ninhBinh, ['tam-coc', 'trang-an']);
  });

  test('SC-35 editor: GET /:id returns the 20 fields, the contact with who recorded it, read-only photos and the publish state', async () => {
    const res = await callAdmin('one', 'GET', { id: MUI_NE });
    assert.equal(res.status, 200);
    const data = await res.json();

    for (const field of TWENTY_FIELDS) {
      assert.ok(field in data, `${field} is present`);
    }
    assert.equal(data.intake_status, 'awaiting_contact');
    assert.equal(data.published, false);
    assert.equal(data.can_publish, false);
    assert.equal(data.blocked_reason, 'Authority contact not verified (M3 BR-004).');
    assert.equal(data.authority_contact.contact_name, 'Phan Văn Lộc');
    assert.equal(data.authority_contact.contact_verified, false);
    assert.equal(data.authority_contact.verified_by_name, 'Lê Hoàng Phúc');
    assert.equal(data.photos.length, 1);
    assert.equal(data.photos[0].status, 'hidden');
    assert.ok(data.photos[0].image_source && data.photos[0].usage_right);
  });

  test('FR-001: an unknown id answers 404', async () => {
    const res = await callAdmin('one', 'GET', { id: '00000000-0000-4000-8000-000000000000' });
    assert.equal(res.status, 404);
  });
});
