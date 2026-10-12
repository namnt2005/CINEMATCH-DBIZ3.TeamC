import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../../app/api/locations/search/route.js';

describe('GET /api/locations/search (US-1 Scenario 1.2, F-M3-06, F-M3-08, F-M3-09)', () => {
  test('returns only published locations scoring >= 40 ranked descending with >= 1 match reason', async () => {
    const url = 'http://localhost:3000/api/locations/search?scene_types=karst,river';
    const req = new Request(url, { method: 'GET' });

    const res = await GET(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(Array.isArray(data.results), 'Should return results array');
    assert.ok(data.results.length > 0, 'Should find matching seed locations (e.g. Tràng An, Tam Cốc)');

    // Verify ordering descending by score
    for (let i = 0; i < data.results.length - 1; i++) {
      assert.ok(
        data.results[i].score >= data.results[i + 1].score,
        'Results must be sorted by score descending'
      );
    }

    // Verify cutoff and reasons
    for (const card of data.results) {
      assert.ok(card.score >= 40, `Result ${card.name_en} score ${card.score} must be >= 40`);
      assert.ok(
        Array.isArray(card.match_reasons) && card.match_reasons.length >= 1,
        `Result ${card.name_en} must contain at least one match reason`
      );
    }
  });

  test('supports diacritic-insensitive Vietnamese search queries (F-M3-06)', async () => {
    const url = 'http://localhost:3000/api/locations/search?q=trang%20an';
    const req = new Request(url, { method: 'GET' });

    const res = await GET(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    const foundTrangAn = data.results.some(r => r.slug === 'trang-an');
    assert.equal(foundTrangAn, true, 'Unaccented search "trang an" should match Tràng An');
  });
});
