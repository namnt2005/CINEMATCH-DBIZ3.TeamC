import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getLocationBySlug } from '../../lib/db/locations.js';

const loadNearby = () => import('../../lib/db/nearby.js');

describe('Nearby locations within 30 km (T032, F-M3-14, SC-16 #12)', () => {
  test('F-M3-14: haversineKm gives the trang-an → tam-coc distance (about 6.5 km)', async () => {
    const { haversineKm } = await loadNearby();
    const d = haversineKm({ lat: 20.2536, lng: 105.8917 }, { lat: 20.215, lng: 105.938 });
    assert.ok(d > 6 && d < 7, `Expected about 6.5 km, got ${d}`);
  });

  test('F-M3-14: trang-an lists tam-coc and never itself, with distance_km', async () => {
    const { getNearbyLocations } = await loadNearby();
    const trangAn = getLocationBySlug('trang-an');
    const nearby = getNearbyLocations(trangAn.location_id);

    assert.deepEqual(nearby.map(n => n.slug), ['tam-coc']);
    assert.ok(nearby[0].distance_km > 6 && nearby[0].distance_km < 7);
  });

  test('F-M3-14 / BR-008: unpublished cua-van (7.8 km from ha-long) is excluded', async () => {
    const { getNearbyLocations } = await loadNearby();
    const haLong = getLocationBySlug('ha-long');
    const nearby = getNearbyLocations(haLong.location_id);

    assert.ok(!nearby.some(n => n.slug === 'cua-van'));
  });

  test('F-M3-14: every result is within the radius, at most 5, sorted by distance', async () => {
    const { getNearbyLocations } = await loadNearby();
    const trangAn = getLocationBySlug('trang-an');

    const wide = getNearbyLocations(trangAn.location_id, { radiusKm: 2000 });
    assert.ok(wide.length <= 5, 'At most 5 nearby locations');
    for (let i = 0; i < wide.length - 1; i++) {
      assert.ok(wide[i].distance_km <= wide[i + 1].distance_km, 'Sorted by distance ascending');
    }
    assert.ok(wide.every(n => n.distance_km <= 2000));

    assert.deepEqual(getNearbyLocations(trangAn.location_id, { radiusKm: 3 }), []);
  });
});
