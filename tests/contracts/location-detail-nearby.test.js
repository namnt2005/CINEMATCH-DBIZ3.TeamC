import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../../app/api/locations/[slug]/route.js';

async function getDetail(slug) {
  const req = new Request(`http://localhost:3000/api/locations/${slug}`, { method: 'GET' });
  return (await GET(req, { params: { slug } })).json();
}

describe('GET /api/locations/:slug nearby_locations (T035, F-M3-14, SC-16 #12)', () => {
  test('F-M3-14: trang-an lists tam-coc with its distance and coordinates', async () => {
    const data = await getDetail('trang-an');

    assert.ok(Array.isArray(data.nearby_locations));
    assert.deepEqual(data.nearby_locations.map(n => n.slug), ['tam-coc']);
    const [tamCoc] = data.nearby_locations;
    assert.ok(tamCoc.distance_km > 6 && tamCoc.distance_km < 7);
    assert.equal(tamCoc.name_en, 'Tam Coc – Bich Dong');
    assert.deepEqual(tamCoc.coordinates, { lat: 20.215, lng: 105.938 });
  });

  test('F-M3-14 / BR-008: ha-long does not list unpublished cua-van', async () => {
    const data = await getDetail('ha-long');
    assert.ok(!data.nearby_locations.some(n => n.slug === 'cua-van'));
  });

  test('F-M3-14: a location with nothing within 30 km gets an empty list, not a missing field', async () => {
    const data = await getDetail('ca-mau-cape');
    assert.deepEqual(data.nearby_locations, []);
  });
});
