import { query, getOne } from './client.js';

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance in km between two { lat, lng } points.
 */
export function haversineKm(a, b) {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Published locations near a location, closest first (F-M3-14, SC-16 #12).
 * Local version: Haversine over node:sqlite. On Supabase the same signature
 * is served by PostGIS ST_DWithin.
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

  return candidates
    .map(loc => ({
      location_id: loc.location_id,
      slug: loc.slug,
      name_en: loc.name_en,
      name_vi: loc.name_vi,
      coordinates: { lat: Number(loc.lat), lng: Number(loc.lng) },
      distance_km: Math.round(haversineKm(origin, loc) * 100) / 100
    }))
    .filter(loc => loc.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);
}
