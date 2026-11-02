import { query, getOne } from '../client.js';
import { nearestLocations } from '../geo.js';

export { haversineKm } from '../geo.js';

/**
 * Published locations near a location, closest first (F-M3-14, SC-16 #12).
 * node:sqlite version; lib/db/supabase/nearby.js has the same signature.
 *
 * @param {string} locationId
 * @param {{ radiusKm?: number, limit?: number }} [options] radius default 30 km, max 5 results
 * @returns {{ location_id: string, slug: string, name_en: string, name_vi: string,
 *             coordinates: { lat: number, lng: number }, distance_km: number }[]}
 */
export function getNearbyLocations(locationId, { radiusKm = 30, limit = 5 } = {}) {
  const origin = getOne('SELECT lat, lng FROM location WHERE location_id = ?', [locationId]);
  if (!origin) return [];

  // BR-008: only published locations are ever suggested
  const candidates = query(
    `
    SELECT location_id, slug, name_en, name_vi, lat, lng
    FROM location
    WHERE location_id != ?
      AND (published = 'true' OR published = 1)
      AND intake_status = 'published'
    `,
    [locationId]
  );

  return nearestLocations(origin, candidates, { radiusKm, limit });
}
